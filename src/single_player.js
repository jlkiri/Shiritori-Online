import {Screen, Timer} from './view';
import {kanjiReply, kanaReply, check, kanaValidate, kanjiValidate, normalize, lookup} from './engine';

export default function launchSingleGame(socket, {mode, speed}) {
  let screen = new Screen();
	let timer = new Timer(speed);
	let pool = [];
	let combo = 0;
  let validate = switchValidateFunction(mode);
	let opponentGuess = switchGuessFunction(mode);	
	timer.attach();
	screen.launch();
	timer.addObserver(screen);
  timer.start();
	screen.player.focus();
	screen.message.textContent = 'Your turn!';
  screen.update = async function update(note) {
		if (note === 'lost') {
			this.message.textContent = 'You lost! Looking up the word...';
			let lookupResult = await lookup(screen.opponent.value);
			timer.remove();
			screen.saveButton.onclick = () => {
				screen.return();
				socket.emit('return');
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
				combo++;
        screen.message.textContent = "Good! Your opponent's turn...";
        let norm = normalize(word);
				let reply = await opponentGuess(norm.slice(-1), pool);
				if (reply) {
					pool.push(word, reply);
					screen.player.value = '';
					screen.opponent.value = reply;
					timer.reset();
					screen.enable(combo);
					screen.player.focus();
					screen.message.textContent = 'Your turn!';
				} else {
					screen.message.textContent = 'You win!';
					timer.remove();
					screen.remove();
					socket.emit('return');
				}
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
  };
}

function switchGuessFunction(mode) {
  if (mode == 'Kanji') return kanjiReply;
	else if (mode == 'Kana') return kanaReply;
}

function switchValidateFunction(mode) {
  if (mode == 'Kanji') return kanjiValidate;
	else if (mode == 'Kana') return kanaValidate;
}