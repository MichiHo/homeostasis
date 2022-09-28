///////////////////////////////////////////////////////////////////////////////
// UTILITIES

const note_names = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

/** Convert note name to midi note */
function noteToMidi(note) {
    let key_number;
    let octave;

    if (note.length === 3) {
        octave = note.charAt(2);
    } else {
        octave = note.charAt(1);
    }

    key_number = note_names.indexOf(note.slice(0, -1));

    if (key_number < 3) {
        key_number = key_number + 12 + (octave - 1) * 12 + 1;
    } else {
        key_number = key_number + (octave - 1) * 12 + 1;
    }
    return 20 + key_number;
}

/** Return the midi code for the next C. Returns the input if it already is a C. */
function nextC(midi) {
    return 12 * Math.ceil(midi/12)
}
/** Convert midi number to note name, e.g. F#3 */
function midiToNote(midi) {
	let midi_int = Math.floor(midi)
    if (!(midi_int >= 12)) {
        throw `Invalid midi code ${midi_int}`;
    }
    let note = midi_int - 12;
    let octave = Math.floor(note / 12);
    return `${note_names[(note + 3) % 12]}${octave}`;
}
const midiFormat = {
    to: midiToNote,
    from: noteToMidi,
};
/** Convert from midi note to frequency in Hertz */
function midiToHertz(midi,tuning=440) {
    return tuning * Math.pow(2, (midi - 69) / 12);
}
function interval(a, b) {
    return a > b ? a - b : b - a;
}
function clamp(val,min,max) {
    return Math.min(Math.max(val,min),max)
}
/** Normalize array such that the highest value is 1.0 */
function normalizeProbs(probs) {
    let max = 0;
    for (let p of probs) max = Math.max(max,p);
    let result = [];
    for (let p of probs) result.push(p / max);
    return result;
}

const min_db = -60
function dbToLin(db,mindB=min_db) {
	if (db <= mindB) return 0;
	return Math.pow(10,db/20.0)
}
function linToDb(lin,mindB=min_db) {
	if (lin < dbToLin(mindB)) return mindB;
	return 20.0 * Math.log10(lin);
}
const dbFormat = {
	to: dbToLin,
	from: linToDb
}
/** Return percent string for use in CSS from number between 0.0 and 1.0 */
var percent = function(number) {
    return `${(number*100).toFixed(2)}%`
}