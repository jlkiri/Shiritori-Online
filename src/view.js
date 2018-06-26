import { el, mount, unmount, text, setChildren } from 'redom';

export {Popup, IncomingRequest, Li, Score, Timer, Screen, Controls, SendRequest, Login};

let hidden, visibilityChange;

if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

class Controls {
  constructor() {
    this.speed = 50;
    this.level = 'Easy';
    this.modes = new Modes();
    this.levels = {Easy: 50, Normal: 25, Hard: 10};
    this.m = el('h4.control__text', 'Choose difficulty and mode');
    this.button = el('button.control__play', 'Fight AI');
    this.div = el('div.control-group');
    for (let l in this.levels) {
      let radio = el('input', {type: 'radio', name: 'speed', value: this.levels[l]});
      radio.checked = this.levels[l] == 50 ? true : false;
      let label = el('label.control.control--radio', `${l}`, radio, el('div.control__indicator'));
      radio.onchange = () => {
        this.speed = radio.value;
        this.level = l;
      }
      this.div.appendChild(label);
    }
    this.window = el('section.controls', this.m, this.div, this.modes.window);
  }
}

class Modes {
  constructor() {
    this.mode = 'Kana';
    this.modes = {kana: 'Kana', kanji: 'Kanji'};
    this.window = el('div.control-group');
    for (let mode in this.modes) {
      let radio = el('input', {type: 'radio', name: 'mode', value: this.modes[mode]});
      radio.checked = this.modes[mode] == 'Kana' ? true : false;
      let label = el('label.control.control--radio', `${radio.value}`, radio, el('div.control__indicator'));
      radio.onchange = () => {
        this.mode = radio.value;
      }
      this.window.appendChild(label);
    }
  }
}

class Screen {
  constructor() {
    this.message = el('h3.screen__message');
    this.player = el('textarea.screen__player');
    this.opponent = el('textarea.screen__opponent', {readOnly: true});
    this.button = el('button.screen__send', 'Send');
    this.comboIndicator = el('h3.screen__message');    
    this.saveButton = el('button.screen__quit', 'Quit');
    this.lookup = new Lookup();
    this.combo = 0;
    this.player.onkeydown = e => {
      if (e.keyCode === 13) {
        this.button.click();
        e.preventDefault();
      }
    };
    this.window = el('section.screen', this.message, this.player, this.button, this.opponent);
  }
  disable() {
    this.player.disabled = true;
    this.button.disabled = true;
  }
  enable(combo = 0) {
    if (combo) this.combo++;
    this.player.disabled = false;
    this.button.disabled = false;
  }
  launch() {
    mount(document.body, this.window);
  }
  remove(result = undefined) {
    unmount(this.window, this.player);
    unmount(this.window, this.button);
    unmount(this.window, this.opponent);    
    this.window.appendChild(this.comboIndicator);
    this.comboIndicator.textContent = `Longest combo: ${this.combo}`;    
    if (result) {
      this.lookup.append(result);
      this.window.appendChild(this.lookup.div);
    }
    this.window.appendChild(this.saveButton);
  }
  return() {
    let time = 3;
    let int = setInterval(() => {
      this.message.textContent = `Going back to lobby in ${time}...`;
      if (!time) {
        clearInterval(int);
        unmount(document.body, this.window);
        let aux = document.querySelectorAll('.aux');
        aux.forEach(el => el.style.display = 'block');
      }
      else time--;
    }, 1000);
  }
}

class Lookup {
  constructor() {
    this.word = el('p.lookup');
    this.definition = el('p.lookup');
    this.pos = el('p.lookup');
    this.div = el('div.lookup-group', this.word, this.definition, this.pos);
  }
  append(entry) {
    this.word.textContent = `Word: ${entry.w}`;
    this.definition.textContent = `Meaning: ${entry.def}`;
    this.pos.textContent = `Part of speech: ${entry.pos}`;
  }
}

class IncomingRequest {
  constructor() {
    this.message = el('h4.modal__message');
    this.warning = el('p.modal__warning');
    this.accept = el('button.modal__accept', 'Accept');
    this.reject = el('button.modal__reject', 'Reject');
    this.content = el('div.modal-content', this.warning, this.message, this.reject, this.accept);
    this.window = el('div.modal', this.content);    
    this.resolved = false;
  }
  show() {
    mount(document.body, this.window);
    this.window.style.display = 'block';
    let time = 30;
    let int = setInterval(() => {
      if (!time) {
        clearInterval(int);
        if (!this.resolved) this.reject.click();
      }
      else {
        this.warning.textContent = `${time} seconds left...`;
        time--;
      }
    }, 1000);
  }
  remove() {
    unmount(document.body, this.window);
  }
}

class SendRequest {
  constructor() {
    this.controls = new Controls();
    this.button = el('button.modal__button', 'Send request');
    this.content = el('div.modal-content', this.m, this.controls.window, this.button),
    this.window = el('div.modal', this.content);
    this.window.style.display = 'block';
    mount(document.body, this.window);
    document.onkeydown = e => {
      if (e.keyCode === 27) {
        this.remove();
      }
    };
    window.addEventListener('touchstart', e => {
      if (e.target.matches('.modal')) this.remove();
    });
  }
  remove() {
    unmount(document.body, this.window);
  }
}

class Popup {
  constructor() {
    this.close = el('button.modal__close', 'Close');
    this.message = el('h3.modal__message');
    this.content = el('div.modal-content', this.message, this.close);
    this.window = el('div.modal', this.content);
    document.onkeydown = e => {
      if (e.keyCode === 27) {
        this.remove();
      }
    };
    document.body.ontouchstart = e => {
      if(!e.target.matches('.controls') || !e.target.matches('.modal__button')) {
        this.remove();
      }
    };
  }
  show() {
    mount(document.body, this.window);
    this.window.style.display = 'block';
    this.close.onclick = () => {
      this.remove();
    };
  }
  remove() {
    unmount(document.body, this.window);
  }
}

class Li {
  constructor () {
    this.el = el('li.userlist__user');
  }
}

class Score {
  constructor() {
    this.el = el('p', 'Score: 0');
    this.value = 0;
  }
  increase() {
    this.value = this.value + 1;
    this.el.textContent = `Score: ${Math.round(this.value)}`;
  }
}

class Timer {
  constructor (speed) {
    this.el = el('div.bar');
    this.speed = speed;
    this.time = 0;
    this.paused = false;
    this.observers = [];
  }
  run(time) {
    let grow = this.time * (100 / this.speed);
		if (grow >= 100) {
      this.notify();
      return false;
    }
    else if (!this.paused) {
      this.time += time;
      this.el.style.width = grow + "%";
      return true;
    }
  }  
  addObserver(obs) {
    this.observers.push(obs);
  }
  reset() {
    this.time = 0;
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  notify() {
    this.observers.forEach(obs => obs.update('lost'));
  }
  attach() {
    mount(document.body, this.el);
  }
  start() {
    runAnimation(time => this.run(time));
  }
  remove() {
    unmount(document.body, this.el);
  }
}

class Login {
  constructor() {
    this.field = el('textarea.login__field', {placeholder: 'Enter your name'});
    this.submit = el('button.login__submit', 'Join');
    this.errorMessage = el('p.login__message','');
    this.el = el('section.login', this.field, this.submit, this.errorMessage);
    this.field.onkeydown = e => {
      if (e.keyCode === 13) {
        this.submit.click();
        e.preventDefault();
      }
    };
  }
}
