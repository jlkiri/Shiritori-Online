import {Screen, Timer} from './view';
import {check, kanaValidate, kanjiValidate, normalize, lookup} from './engine';

export default function launchPVPGame(socket, {mode, speed}, first) {
	let screen = new Screen();
	let timer = new Timer(speed);
	let pool = [];
	let validate = switchValidateFunction(mode);
	timer.attach();
	screen.launch();
	timer.addObserver(screen);
	if (first) {
		timer.start();
		screen.player.focus();
		screen.message.textContent = "Your turn!";
	} else {
		timer.start();
		timer.pause();
		screen.disable();
		screen.player.focus();
		screen.message.textContent = "Your opponent's turn...";
	}
	screen.update = async function update(note) {
		if (note === 'lost') {
			this.message.textContent = 'You lost! Looking up the word...';
			let lookupResult = await lookup(screen.opponent.value);
			timer.remove();
			socket.emit('lost');
			screen.saveButton.onclick = () => {
				screen.return();
			}
			screen.remove(lookupResult);
		}
	};
  screen.button.onclick = async function send() {
		let word = screen.player.value;
		let nzd = normalize(screen.opponent.value);
		let opp = nzd.slice(-1);
		timer.pause();
		screen.disable();
		if (validate(screen.message, pool, word, opp)) {
			screen.message.textContent = 'Checking in dictionary...';
			let result = await check(word, mode);
			if (result) {
				screen.message.textContent = "Good! Your opponent's turn...";
				pool.push(word);
        socket.emit('guess', result);
			} else {
				screen.message.textContent = 'No such word';
				timer.resume();
				screen.enable();
				screen.player.focus();
			}		
		} else {
			timer.resume();
			screen.enable();
			screen.player.focus();
    }
  }  
  socket.on('word', data => {
		screen.player.focus();
    screen.message.textContent = "Your turn!";
    screen.enable();
    timer.reset();
    screen.player.value = '';
		screen.opponent.value = data;
		pool.push(screen.opponent.value);
  });
	socket.on('win', () => {
		timer.pause();
		timer.remove();
		screen.message.textContent = 'You win!';
		screen.saveButton.onclick = () => {
			screen.return();
		}
		screen.remove();
		socket.emit('finish');
		socket.off('word');
		socket.off('win');
	});
}

function switchValidateFunction(mode) {
  if (mode == 'Kanji') return kanjiValidate;
	else if (mode == 'Kana') return kanaValidate;
}