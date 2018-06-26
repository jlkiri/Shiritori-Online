import { isKana, toHiragana, isKanji } from 'wanakana';

export function check(word, mode) {
	return new Promise((resolve, reject) => {
		let query = '"' + word.trim() + '"';
		fetchOK(`/player/${encodeURIComponent(query)}`)
		.then(response => response.json())
		.then(dict => {
			let {data} = JSON.parse(dict);
			let result = isEntry(data, word, mode);
			if (data == false || result == false) {
				resolve(false);
			}
			else resolve(result);
		})
		.catch(reportError);
	});
}

export function normalize(chars) {
	let lastchar = chars.slice(-1);
	if (lastchar == "ー") {
		chars = chars.slice(0,-1);
		return normalize(chars);
	}	
  else {
    lastchar = toHiragana(lastchar);
		let input = toHiragana(chars);
		if (lastchar == "ゃ") {
			return input.slice(0,-1)+"や";
		}
		else if (lastchar == "ょ") {
			return input.slice(0,-1)+"よ";
		}
		else if (lastchar == "ゅ") {
			return input.slice(0,-1)+"ゆ";
		}
		else return input;
	}
}

export function kanaValidate(message, pool, player, opp) {
  if (!player) {
    message.textContent = "Your input is empty!";
    return false;
	}  
	else if (!isKana(player)) {
    message.textContent = "Use only Kana!";
    return false;
  }
	else if (opp && toHiragana(player[0]) !== toHiragana(opp)) {
    message.textContent = "Your first character is wrong!";
    return false;  
	}
	else if (player.slice(-1) == "ん" || player.slice(-1) == "ン") {
    message.textContent = "You cannot use words that end with ん or ン!";
    return false;
  }
  else if (pool.includes(player)) {
    message.textContent = "This word is already used!";
    return false;
	}
  else return true;
}

export function kanjiValidate(message, pool, player, opp) {
	if (!player) {
    message.textContent = "Your input is empty!";
    return false;
	}  
	else if (!isKanji(player)) {
    message.textContent = "Use only Kanji!";
    return false;
	}
	else if (player.length <= 1) {
		message.textContent = "Your can only use words that contain 2 or more characters!";
    return false; 
	}
	else if (opp && player[0] !== opp) {
    message.textContent = "Your first character is wrong!";
    return false;  
	}
  else if (pool.includes(player)) {
    message.textContent = "This word is already used!";
    return false;
  }
  else return true;
}

export async function kanjiReply(value, pool) {
	let entry, random;
	let scale = 35;
	while (scale > 1) {
    random = Math.round(Math.random() * scale) || 1;
		let pageNumber = (random < scale) ? random : scale - 1;
    scale = pageNumber;
		try {
			entry = await fetchOK(`/aikanji/${encodeURIComponent(value)}/&page=${pageNumber}`);
      let dict = await entry.json();
      let {data} = JSON.parse(dict);
			if (data != false) {
				let reply = searchForMatches(value, data, pool);
				if (reply) {
					pool.push(reply);
					return reply;
				}
      }
		} catch(error) {
			reportError(error);
		}
	}
	return false;
}

export function searchForMatches(value, entries, pool) {
  for (let entry of entries) {
		let reply = entry.japanese[0];
		let charArray = reply.word.split("");
		let containsKana = charArray.some(char => isKana(char) || char == '(');
		if (!containsKana && reply.word.length > 1
			 && !pool.includes(reply.word) && reply.word[0] == value) {
      return reply.word;
    }
  }
  return false;
}

export function kanaReply(value, pool) {	
  return new Promise((resolve, reject) => {
    fetchOK(`/aikana/${encodeURIComponent(value)}`)
		.then(response => response.json())
    .then(dict => {
      let reply, entry, ending;
      let {data} = JSON.parse(dict);
      do {
        let guessIdx = Math.floor(Math.random() * (data.length - 1));
        entry = data[guessIdx];
				reply = entry.japanese[0];
				ending = reply.reading.slice(-1);
			} while (ending == "ん" || ending == "ン"
							 || pool.includes(reply.reading));
			let result = reply.word ? "(" + reply.word + ")\n" + reply.reading : reply.reading;
			pool.push(reply.reading);
      resolve(result);
		})
		.catch(reportError);
  });
}

export function fetchOK(url, timeout = 8000) {
  return fetchWithTimeout(url, timeout).then(response => {
    if (response.status < 400) return response;
    else throw new Error(response.statusText);
  });
}

export function lookup(word) {
  return new Promise((resolve, reject) => {
		let query = '"' + word.trim() + '"';
		fetchOK(`/player/${encodeURIComponent(query)}`)
		.then(response => response.json())
		.then(dict => {
      let {data} = JSON.parse(dict);
      let result = extractEntryFromDict(data, word);
      resolve(result);
		})
		.catch(reportError);
	});
}

function extractEntryFromDict(data, word) {
  let entry = data[0];
  let ent = entry.japanese;
  let def = entry.senses[0].english_definitions.join(', ');
  let pos = entry.senses[0].parts_of_speech[0];
  ent = ent.filter(e => Object.values(e).includes(word));
  let w = ('word' in ent[0]) ? `[ ${ent[0].word} ]  ${ent[0].reading}` : `${ent[0].reading}`;
  return {w, def, pos};
}

function isEntry(data, word, mode) {
	for (let entry of data) {
		let e = entry.japanese[0];
		if (mode == "Kana") {
			if (e.reading == word) {
				return word;
			}
		}
		else if (mode == "Kanji") {
			if (e.word == word) {
				return word;
			}
		}
	}
	return false;
}

function fetchWithTimeout(url, timeout) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => {
      setTimeout(() =>  reject(new Error('Connection timed out')), timeout);
    })
  ]);
}

function reportError(error) {
  alert(String(error));
}