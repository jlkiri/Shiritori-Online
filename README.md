# Shiritori Online
This is a multiplayer online version of the traditional Japanese game Shiritori. I made it as I was learning and practicing Javascript.

## Technology
This game makes use of API provided by [Jisho.org](https://jisho.org/) to retrieve dictionary entries.

## Rules
General:
* Once the game begins, you will have limited time to submit a word. The amount of time depends on the difficulty that you have to choose before playing the game. For beginners, Easy is strongly recommended.  

Kanji mode:  
* You must use words that start with the last Kanji character of your opponent's answer.  
* Your words should equal or be longer than 2 characters.  
* It does NOT matter if the reading of your word ends with ん or ン!  
* *Warning*: Kanji mode uses more sophisticated answer algorithm than Kana mode so it takes more time for an opponent to answer (sometimes up to 10 seconds).  

Kana mode:  
* As in the classical game you cannot use words that end with ん or ン.  
* Long vowel mark (ー) is ignored and the preceding character is used instead.  
* You can use either Katakana or Hiragana version of the last character of the opponent word
* Small や/ゆ/よ are capitalized internally, so you can use capitalized versions to answer. Example: じんしゅ　→　ゆめ  
* Your words should equal or be longer than 2 characters.  
