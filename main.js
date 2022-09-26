///////////////////////////////////////////////////////////////////////////////
// CONFIG
const probabilities_size = 13;
function sanitizeConfigInPlace(config) {
    if (config.friends.probabilities.length != probabilities_size) {
        console.log("sanitize probs");
        delete config.friends.probabilities;
    }
    config.friends.num = Number(config.friends.num)
}
const cookieName = "homeostasisCookie";
function storeConfig(exdays = 365) {
    const d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    let expires = "expires=" + d.toUTCString();
    document.cookie =
        cookieName +
        "=" +
        JSON.stringify(config) +
        ";" +
        expires +
        ";path=/; SameSite=Lax";
    console.log("Stored config:");
    console.log(config);
}
/**
 *
 * @returns loaded config file or empty object if no success
 */
function loadConfig() {
    let name = cookieName + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.startsWith(name)) {
            let result = JSON.parse(c.substring(name.length, c.length));
            sanitizeConfigInPlace(result);
            console.log("Loaded config");
            return result;
        }
    }
    return {};
}
/**
 * Called on config change through UI - only save
 */
var configChangeTimer;
function changedConfig() {
    clearTimeout(configChangeTimer);
    configChangeTimer = setTimeout(storeConfig, 500);
}

const min_midi_note = 20;
const max_midi_note = 108;
const modes = ["chords", "glide"];

// Default config
let config = {
    gain_lead: 0.2,
    filter_cutoff_lead: 500.0,
    filter_cutoff_friends: 400.0,
    gain_friends: 0.1,
    gain_master: 1.0,
    keyboard_start_note: 57, // A3
    keyboard_size_factor: 300,
    mode: "glide",
    default_sound: {
        attack: 0.02,
        release: 0.1,
        glide: 0.0001,
    },
    default_friends_sound: {
        attack: 0.02,
        release: 0.1,
        glide: 0.0001,
    },
    friends: {
        min_note: min_midi_note + 24,
        max_note: max_midi_note - 24,
        num: 2,
        neighbourhood: 4,
        jump_weight: 0.7, // impact of jump width (relative to neighbourhood)
        //neighbourhood_ext : 10, // for initializing new voices,
        note_repeat_reset: false,
        probabilities: normalizeProbs([
            0,
            1, //kl sekunde
            2, //gr sekunde
            5, //kl terz
            5, //gr terz
            7, //quarte
            1, //tritonus
            7, //quinte
            1, //kl sexte
            5, //gr sexte
            3, //kl septe
            2, //gr septe
            1, //oktae
        ]),
    },
    vis: {
        friend_plots: false,
        friend_plot_height: 90,
    },
    hidden: {

    }
};
const initial_config = deepmerge(config, {})

// Load from cookie and merge with default
config = deepmerge(initial_config, loadConfig(), {
    arrayMerge: function (destinationArray, sourceArray, options) {
        return sourceArray;
    }, // overwrite arrays instead of concat
});
if (modes.indexOf(config.mode) == -1) config.mode = "chords";

///////////////////////////////////////////////////////////////////////////////
// AUDIO OBJECTS INIT

const ctx = new (window.AudioContext || window.webkitAudioContext)();

const lead_gain = ctx.createGain();
const friends_gain = ctx.createGain();
const master_gain = ctx.createGain();

const lead_filter = ctx.createBiquadFilter();
lead_filter.type = "lowpass";
lead_filter.Q = 5.0;
const friends_filter = ctx.createBiquadFilter();
friends_filter.type = "lowpass";
friends_filter.Q = 5.0;

lead_gain.connect(lead_filter);
lead_filter.connect(master_gain);
friends_gain.connect(friends_filter);
friends_filter.connect(master_gain);
master_gain.connect(ctx.destination);

///////////////////////////////////////////////////////////////////////////////
// UI INIT

var keyboard = null; // created in resizeHandler
var keyboard_octaves = 2; // set in resizeHandler, just placeholder here
var screen_width = 1;

const db_format = wNumb({ decimals: 0, suffix: " dB" });
const hz_format = wNumb({
    decimals: 0,
    suffix: " Hz",
    decoder: function (v) {
        return Math.log10(v);
    },
    encoder: function (v) {
        return Math.pow(10, v);
    },
});

// const plots = $("#homeostasis-plots");
const gain_slider_prototype = {
    connect: "lower",
    range: {
        min: min_db,
        max: 0,
    },
    pips: {
        mode: "range",
        density: 10,
    },
    tooltips: [db_format],
    orientation: "vertical",
    direction: "rtl",
};

// master gain
const gain_master_slider = document.getElementById("ctrl-gain-master");
noUiSlider.create(gain_master_slider, {
    ...gain_slider_prototype,
    start: linToDb(config.gain_master),
});
gain_master_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.gain_master = dbToLin(val);
    master_gain.gain.setValueAtTime(config.gain_master, ctx.currentTime);
    changedConfig();
});

// lead voice gain
const gain_lead_slider = document.getElementById("ctrl-gain-lead");
noUiSlider.create(gain_lead_slider, {
    ...gain_slider_prototype,
    start: linToDb(config.gain_lead),
});
gain_lead_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.gain_lead = dbToLin(val);
    lead_gain.gain.setValueAtTime(config.gain_lead, ctx.currentTime);
    changedConfig();
});

// friends voices gain
const gain_friends_slider = document.getElementById("ctrl-gain-friends");
noUiSlider.create(gain_friends_slider, {
    ...gain_slider_prototype,
    start: linToDb(config.gain_friends),
});
gain_friends_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.gain_friends = dbToLin(val);
    friends_gain.gain.setValueAtTime(config.gain_friends, ctx.currentTime);
    changedConfig();
});

const filter_slider_prototype = {
    connect: "lower",
    range: {
        min: Math.log10(20),
        max: Math.log10(10000),
    },
    tooltips: [hz_format],
};
const glide_slider_prototype = {
    connect: "lower",
    range: {
        min: 0,
        max: 2,
    },
    tooltips: [wNumb({ suffix: "s", decimals: 2 })],
};
// lead voice filter cutoff
const cutoff_lead_slider = document.getElementById("ctrl-filter-lead");
noUiSlider.create(cutoff_lead_slider, {
    ...filter_slider_prototype,
    start: Math.log10(config.filter_cutoff_lead),
});
cutoff_lead_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.filter_cutoff_lead = Math.pow(10, val);
    lead_filter.frequency.setValueAtTime(
        config.filter_cutoff_lead,
        ctx.currentTime
    );
    changedConfig();
});

const glide_lead_slider = document.getElementById("ctrl-glide-lead");
noUiSlider.create(glide_lead_slider, {
    ...glide_slider_prototype,
    start: config.default_sound.glide,
});
glide_lead_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.default_sound.glide = val[0];
    main_voice.glide = val[0];
    changedConfig();
});

// friends filter cutoff
const cutoff_friends_slider = document.getElementById("ctrl-filter-friends");
noUiSlider.create(cutoff_friends_slider, {
    ...filter_slider_prototype,
    start: Math.log10(config.filter_cutoff_friends),
});
cutoff_friends_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.filter_cutoff_friends = Math.pow(10, val);
    friends_filter.frequency.setValueAtTime(
        config.filter_cutoff_friends,
        ctx.currentTime
    );
    changedConfig();
});

const glide_friends_slider = document.getElementById("ctrl-glide-friends");
noUiSlider.create(glide_friends_slider, {
    ...glide_slider_prototype,
    start: config.default_friends_sound.glide,
});
glide_friends_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.default_friends_sound.glide = val[0];
    for (let friend of friends) {
        friend.sound.glide = val[0];
    }
    changedConfig();
});

///////////////////////////////////////////////////////////////////////////////
// FRIENDS CONTROLS

function changedNumFriends() {
    //$("#ctrl-num-voices-label").text(`Voices: ${config.friends.num}`);
    for (let i = friends.length - 1; i >= config.friends.num; i--) {
        // delete excess voices
        friends[i].sound.stop();
        $(`#btn-reset-${i}`).remove()
        delete friends[i];
    }
    for (let i = friends.length; i < config.friends.num; i++) {
        // add new voices
        console.log(`Add ${i}`);
        friends.push(new Friend(friends_gain, ctx));
        let prev_btn
        if (i == 0) {
            prev_btn = $('#btn-reset-all')
        } else {
            prev_btn = $(`#btn-reset-${i-1}`)
        }
        let new_btn = $(`<div class="bottom-btn bottom-ctrl" id="btn-reset-${i}">${i}</div>`)
        new_btn.on('click',function(ev) {
            friends[i].note = -1;
            friends[i].sound.stop();
        })
        new_btn.insertAfter(prev_btn);
    }
    friends = friends.slice(0, config.friends.num);
    $('.display-num-voices').text((config.friends.num + 0).toFixed(0))
    // friend_plots()
}
$("#ctrl-num-voices").on("input", function (ev) {
    config.friends.num = Number($(ev.target).val());

    changedNumFriends();
    changedConfig();
});
$('#btn-reset-all').on('click',function(ev) {
    for (let friend of friends) {
        friend.note = -1;
        friend.sound.stop();
    }
})
$('#btn-reset-config').on('click',function(ev) {
    for (let friend of friends) {
        friend.note = -1;
        friend.sound.stop();
    }
    main_voice.stop()
    config = deepmerge(initial_config,{})
    applyConfig()
    changedConfig()
})

const friends_range_slider = document.getElementById("ctrl-friends-range");
noUiSlider.create(friends_range_slider, {
    start: [config.friends.min_note, config.friends.max_note],
    connect: true,
    step: 1,
    range: {
        min: min_midi_note,
        max: max_midi_note,
    },
    tooltips: [midiFormat, midiFormat],
});
friends_range_slider.noUiSlider.on("slide", function (_, handle, values) {
    console.log(values);
    config.friends.min_note = values[0];
    config.friends.max_note = values[1];
    changedConfig();
});
$("#ctrl-num-octaves").on("input", function (ev) {
    setDesiredNumOctaves(Number($(ev.target).val()));
});

const friends_neighbourhood_slider =
    document.getElementById("ctrl-neighbourhood");
noUiSlider.create(friends_neighbourhood_slider, {
    connect: "lower",
    start: [config.friends.neighbourhood],
    step: 1,
    range: {
        min: 0,
        max: 20,
    },
    tooltips: [wNumb({ decimals: 0 })],
});
friends_neighbourhood_slider.noUiSlider.on("change", function (_, __, values) {
    config.friends.neighbourhood = values[0];
    for (let friend of friends) {
        friend.neighbourhood = config.friends.neighbourhood
    }
    changedConfig();
});

const friends_distance_weight_slider =
    document.getElementById("ctrl-distance-weight");
noUiSlider.create(friends_distance_weight_slider, {
    connect: "lower",
    start: [config.friends.neighbourhood],
    range: {
        min: 0,
        max: 1,
    },
    tooltips: [wNumb({ decimals: 2 })],
});
friends_distance_weight_slider.noUiSlider.on("change", function (_, __, values) {
    config.friends.jump_weight = values[0];
    for (let friend of friends) {
        friend.jump_weight = config.friends.jump_weight
    }
    changedConfig();
});

$("#chk-reset-on-hit").on('change', function (event) {
    config.friends.note_repeat_reset = event.currentTarget.checked;
    changedConfig();
})


const keyboard_range_slider = document.getElementById("ctrl-keyboard-range");
noUiSlider.create(keyboard_range_slider, {
    start: [
        config.keyboard_start_note,
        config.keyboard_start_note + keyboard_octaves * 2,
    ],
    connect: true,
    behaviour: "drag-fixed",
    step: 1,
    tooltips: [midiFormat, midiFormat],
    pips: {
        mode: "steps",
        filter: function (value, type) {
            if (value % 12 === 0) return 1;
            else if ([1, 3, 6, 8, 10].indexOf(value % 12) > -1) return 0;
            else return -1;
        },
        density: 50,
        stepped: true,
        format: midiFormat,
    },
    range: {
        min: min_midi_note,
        max: max_midi_note,
    },
});
keyboard_range_slider.noUiSlider.on("change", function (_, handle, values) {
    config.keyboard_start_note = Math.floor(values[0]);
    updateKeyboard();
    changedConfig();
});

// Keyboard range display
{
    let ranges_keyboard = $('.note-range-keyboard-display')
    let width = percent(1.0 / (max_midi_note - min_midi_note))
    for (let i = min_midi_note; i < max_midi_note; i++) {
        let item = $("<li>").attr('id', `range-note-${i}`).css('width', width)
        let midi = midiToNote(i)
        if (midi.includes('#')) item.addClass('range-note-black')
        else item.addClass('range-note-white')
        if (midi[0] == 'E' || midi[0] == 'B') item.addClass('range-note-needs-sep')
        item.appendTo(ranges_keyboard)
    }
}

let prob_ui = new ProbabilitiesUI("ctrl-probabilities", { initial_values: initial_config.friends.probabilities });
prob_ui.set_probabilities(config.friends.probabilities);
prob_ui.on_change = function (probs, i) {
    config.friends.probabilities = probs;
    for (let friend of friends) {
        friend.probabilities = probs;
    }
    changedConfig();
};

///////////////////////////////////////////////////////////////////////////////
// BASIC OSCILLATOR

class Instrument {
    constructor(outputNode, ctx, spec = {}) {
        this.playing = false;
        this.note = 0;

        this.attack = spec.attack || config.default_sound.attack;
        this.release = spec.release || config.default_sound.release;
        this.glide = spec.glide || config.default_sound.glide;
        this.type = spec.type || "sawtooth";
        this.outputNode = outputNode;
        this.ctx = ctx;
        this.osc = null;

        this.envelope = ctx.createGain();
        this.envelope.connect(outputNode);
    }

    play(note, gain = 1.0, time = 0) {
        time = time || this.ctx.currentTime;
        let frequency = midiToHertz(note);

        if (!this.playing) {
            this.envelope.gain.setValueAtTime(0.0, time);
            this.envelope.gain.linearRampToValueAtTime(gain, time + this.attack);

            // new sound
            this.osc = this.ctx.createOscillator();
            this.osc.frequency.value = frequency;
            this.osc.type = this.type;
            this.osc.connect(this.envelope);
            this.osc.start(time);
        } else {
            // glide with frequency AND gain :)
            this.osc.frequency.linearRampToValueAtTime(frequency, time + this.glide);
            this.envelope.gain.linearRampToValueAtTime(gain, time + this.glide);
        }
        this.playing = true;
        this.note = note;
    }
    stop(time = 0) {
        time = time || this.ctx.currentTime;
        if (this.playing && this.osc) {
            let end_time = time + this.release;
            this.envelope.gain.linearRampToValueAtTime(0.0, end_time);
            this.osc.stop(end_time);
            this.playing = false;
        }
    }
}
class Friend {
    constructor(outputNode, ctx, friendSpec = {}, instrumentSpec = {}) {
        this.latest_probabilities = [];
        this.latest_probabilities_min = 0;
        this.note = 0;

        this.probabilities =
            friendSpec.probabilities || [].concat(config.friends.probabilities);
        this.neighbourhood =
            friendSpec.neighbourhood || config.friends.neighbourhood;
        this.min_note = friendSpec.min_note || config.friends.min_note;
        this.max_note = friendSpec.max_note || config.friends.max_note;
        this.jump_weight = friendSpec.jump_weight || config.friends.jump_weight;

        this.sound = new Instrument(
            outputNode,
            ctx,
            deepmerge(config.default_friends_sound, instrumentSpec)
        );
    }

    newNote(other_notes, time = 0) {
        /*
            Look at set of neighbours around prev_note
            calculate probability and pick best
            - favor small jumps
            - favor non-extreme pitches
            - exclude notes already played
            */

        let min_note;
        let max_note;
        if (this.note <= 0) {
            // Infer note from anywhere within the other notes
            // for (let note of other_notes){
            //     min_note = Math.min(min_note,note)
            //     max_note = Math.max(max_note,note)
            // }
            // min_note -= config.friends.neighbourhood_ext
            // max_note += config.friends.neighbourhood_ext
            min_note = this.min_note;
            max_note = this.max_note;
        } else {
            // Normal neighbourhood around prev note
            min_note = Math.max(this.note - this.neighbourhood, this.min_note);
            max_note = Math.min(this.note + this.neighbourhood, this.max_note);
        }

        this.latest_probabilities_min = min_note;

        let bestNotes = [];
        let bestNoteProb = 0.0;
        this.latest_probabilities = [];
        for (let note = min_note; note < max_note; note++) {
            let prob = 1.0;
            // Interval probabilities
            for (let other of other_notes) {
                if (other === 0) continue;
                let interv = interval(note, other);
                while (interv > 12) interv -= 12;
                if (interv > 0 && interv < this.probabilities.length) {
                    prob *= this.probabilities[interv];
                } else prob = 0.0;
            }
            // Distance probability impact
            if (this.jump_weight > 0.0 && this.note > 0) {
                prob *=
                    1.0 - this.jump_weight +
                    (this.jump_weight *
                        (this.neighbourhood - interval(note, this.note))) /
                    this.neighbourhood;
            }

            if (prob == bestNoteProb) {
                bestNotes.push(note);
            } else if (prob > bestNoteProb) {
                bestNoteProb = prob;
                bestNotes = [note];
            }
            this.latest_probabilities.push(prob);
        }
        let bestNote = -1;
        if (bestNotes.length == 1) {
            bestNote = bestNotes[0]
        } else if (bestNotes.length > 0) {
            let ind = Math.floor(Math.random() * bestNotes.length);
            bestNote = bestNotes[ind];
        }
        this.note = bestNote;
        if (bestNote <= 0) {
            this.sound.stop()
        } else {
            this.sound.play(this.note);
        }
        return bestNote;
    }
}

var main_voice = new Instrument(lead_gain, ctx);
var last_main_note = -1;
var friends = [];
// for (let i = 0; i < config.friends.num; i++)
//     friends.push(new Friend(friends_gain, ctx));
var friend_reset_index = -1;

function stopFriends() {
    for (let friend of friends) {
        friend.sound.stop();
    }
}
function resetFriendKeys() {
    for (let friend of friends) {
        if (friend.note > 0) {
            let note_name = midiToNote(friend.note);
            $(`#${note_name.replace("#", "\\#")}`)
                .css("background-color", note_name.includes("#") ? "black" : "white")
                .empty();
            $(`.note-range-keyboard-display li`).removeClass('range-note-lead').removeClass('range-note-friend')
        }
    }
}
function keyDownHandler(note_str, frequency) {
    let note = noteToMidi(note_str);
    console.log(`Note ${note} ${typeof note} (${note_str}) at ${frequency} Hz`);
    if (config.mode == "chords") {
        main_voice.stop();
        stopFriends();
    }
    resetFriendKeys();


    // new lead voice
    main_voice.play(note);
    $(`#range-note-${note}`).addClass('range-note-lead')
    if (config.friends.num > 0) {

        // if same note multiple times, reset random friends
        if (last_main_note == note && config.friends.note_repeat_reset) {
            friend_reset_index = (friend_reset_index + 1) % config.friends.num;
            friends[friend_reset_index].note = -1;
        } else friend_reset_index = -1;

        last_main_note = note;

        // friend voices
        let notes = [];
        for (let friend of friends) {
            notes.push(friend.note);
        }
        let i = -1;
        for (let friend of friends) {
            i++;
            notes[i] = note;
            let reset_this = i == friend_reset_index;
            let new_note = friend.newNote(notes);
            if (new_note >= 0) {
                // Playable keyboard visualization
                $(`#${midiToNote(new_note).replace("#", "\\#")}`)
                    .css("background-color", reset_this?"lightgreen":"green")
                    .append(`<span>${i + 1}</span>`);

                // Small full keyboard visualization
                $(`#range-note-${new_note}`).addClass('range-note-friend').toggleClass('range-note-friend-reset',reset_this);
            }
            notes[i] = new_note;
        }
        // friend_plots();
    }
}
function keyUpHandler(note, frequency) {
    if (noteToMidi(note) == main_voice.note) {
        main_voice.stop();
        stopFriends();
        resetFriendKeys();
    }
}

/**
 *
 * @param {float[]} probabilities Probabilities for intervals from 1 to 12 semitones
 * @param {int[]} other_notes Array of other notes, must be non-empty
 * @param {int} prev_note Own previous note, set to -1 to restart
 * @returns
 */
function findNote(probabilities, other_notes, prev_note = -1) {
    /*
        Look at set of neighbours around prev_note
        calculate probability and pick best
        - favor small jumps
        - favor non-extreme pitches
        - exclude notes already played
        */

    let min_note;
    let max_note;
    if (prev_note == -1) {
        // Infer note from anywhere within the other notes
        // for (let note of other_notes){
        //     min_note = Math.min(min_note,note)
        //     max_note = Math.max(max_note,note)
        // }
        // min_note -= config.friends.neighbourhood_ext
        // max_note += config.friends.neighbourhood_ext
        min_note = config.friends.min_note;
        max_note = config.friends.max_note;
    } else {
        // Normal neighbourhood
        min_note = prev_note;
        max_note = prev_note;
    }

    // Clamp to piano range
    min_note = Math.max(
        min_note - config.friends.neighbourhood,
        config.friends.min_note
    );
    max_note = Math.min(
        max_note + config.friends.neighbourhood,
        config.friends.max_note
    );
    console.log(
        `Notes between ${min_note} and ${max_note} (${max_note - min_note
        } semitones), ${other_notes.length} other notes`
    );

    let bestNotes = [];
    let bestNoteProb = 0.0;
    let these_probabilities = [];
    for (let note = min_note; note < max_note; note++) {
        let prob = 1.0;
        // Interval probabilities
        for (let other of other_notes) {
            if (other == -1) continue;
            let interv = interval(note, other);
            while (interv > 12) interv -= 12;
            if (interv > 0 && interv < probabilities.length) {
                prob *= probabilities[interv];
            } else prob = 0.0;
        }
        // Jump probability, at least 0.5
        // if (prev_note > -1) {
        //     prob *= 0.7 + 0.3*(neighbourhood-interval(note,prev_note))/neighbourhood
        // }

        // Total pitch probability TODO
        //if (note < )
        if (prob == bestNoteProb) {
            bestNotes.push(note);
        } else if (prob > bestNoteProb) {
            bestNoteProb = prob;
            bestNotes = [note];
        }
        these_probabilities.push(prob);
    }
    let bestNote = -1;
    if (bestNotes.length > 0) {
        let ind = Math.floor(Math.random() * bestNotes.length);
        bestNote = bestNotes[ind];
    }
    return [bestNote, min_note, these_probabilities];
}

function applyConfig() {
    // UI Updates
    $("#ctrl-num-voices").val(config.friends.num);
    $("#chk-reset-on-hit").prop('checked', config.friends.note_repeat_reset);
    gain_master_slider.noUiSlider.set(linToDb(config.gain_master));
    gain_lead_slider.noUiSlider.set(linToDb(config.gain_lead));
    gain_friends_slider.noUiSlider.set(linToDb(config.gain_friends));
    cutoff_lead_slider.noUiSlider.set(Math.log10(config.filter_cutoff_lead));
    cutoff_friends_slider.noUiSlider.set(
        Math.log10(config.filter_cutoff_friends)
    );
    glide_lead_slider.noUiSlider.set(config.default_sound.glide)
    glide_friends_slider.noUiSlider.set(config.default_friends_sound.glide)
    friends_neighbourhood_slider.noUiSlider.set(config.friends.neighbourhood)
    friends_distance_weight_slider.noUiSlider.set(config.friends.jump_weight)
    changedNumFriends();
    resizeHandler(); // creates keyboard, sets num-octaves
    // friend_plots();
    prob_ui.set_probabilities(config.friends.probabilities);
    $('.controls-section').each(function (i, obj) {
        if (obj.id in config.hidden) {
            if (config.hidden[obj.id]) {
                obj.classList.add('hidden')
            } else {
                obj.classList.remove('hidden')
            }
        } else {
            config.hidden[obj.id] = obj.classList.contains('hidden')
        }
    })

    // Value updates
    let t2 = ctx.currentTime + 1.0;
    lead_gain.gain.linearRampToValueAtTime(config.gain_lead, t2);
    friends_gain.gain.linearRampToValueAtTime(config.gain_friends, t2);
    master_gain.gain.linearRampToValueAtTime(config.gain_master, t2);
    lead_filter.frequency.linearRampToValueAtTime(config.filter_cutoff_lead, t2);
    friends_filter.frequency.linearRampToValueAtTime(
        config.filter_cutoff_friends,
        t2
    );
}

function updateKeyboard() {
    delete keyboard;
    $("#keyboard").empty();
    console.log(
        `Update keyboard from ${midiToNote(
            config.keyboard_start_note
        )} with ${keyboard_octaves} octaves`
    );
    let new_start_note = midiToNote(config.keyboard_start_note).replace("#", ""); // qwerty-hancock only accepts white keys. Remove sharp
    keyboard = new QwertyHancock({
        id: "keyboard",
        width: screen_width - 16, // remove padding
        height: 150,
        octaves: keyboard_octaves,
        startNote: new_start_note,
    });
    keyboard.keyDown = keyDownHandler;
    keyboard.keyUp = keyUpHandler;
    $('.display-kbd-range').text((keyboard_octaves * 12 - 1).toFixed(0))
    $('#ctrl-num-octaves').val(keyboard_octaves)
}

function resizeHandler() {
    screen_width = $(window).width();
    keyboard_octaves = Math.floor(clamp((screen_width - 300) / config.keyboard_size_factor, 2, 7));
    keyboard_range_slider.noUiSlider.set([
        config.keyboard_start_note,
        config.keyboard_start_note + keyboard_octaves * 12,
    ]);
    updateKeyboard();
    // friend_plots();
}
function setDesiredNumOctaves(num) {
    num = clamp(num, 2, 7);
    screen_width = $(window).width();
    config.keyboard_size_factor = (screen_width - 450) / num;
    changedConfig()
    resizeHandler()
}


var resizeTimer;
$(window).resize(function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeHandler, 500);
});

applyConfig();

$(".controls-section").each(function (i, obj) {
    $(obj)
        .find("h2")
        .on("click", function (e) {
            obj.classList.toggle("hidden");
            config.hidden[obj.id] = obj.classList.contains('hidden');
            changedConfig()
        })
        .prepend("<span class='hide-icon'>&#9666;</span>");
});
$(".ctrl-hint").each(function (i, obj) {
    let hints = obj.attributes["data-ctrl-hints"].value.split(" ");
    obj.onmouseenter = function (event) {
        for (let hint of hints) {
            // find ctrl
            let obj = document.getElementById(hint)
            while (obj != null && !obj.classList.contains('ctrl')) {
                obj = obj.parentElement
            }
            if (obj != null) {
                obj.classList.add("ctrl-highlight")
            }
            while (obj != null && !obj.classList.contains('controls-section')) {
                obj = obj.parentElement
            }
            if (obj != null && obj.classList.contains("hidden")) {
                obj.classList.remove("hidden")
                obj.data_was_hidden = "true"
            }
        }
    };
    obj.onmouseleave = function (event) {
        for (let hint of hints) {
            // find ctrl
            let obj = document.getElementById(hint)
            while (obj != null && !obj.classList.contains('ctrl')) {
                obj = obj.parentElement
            }
            if (obj != null) {
                obj.classList.remove("ctrl-highlight")
            }
            while (obj != null && !obj.classList.contains('controls-section')) {
                obj = obj.parentElement
            }
            if (obj != null && obj.data_was_hidden == "true") {
                obj.classList.add("hidden")
                obj.removeAttribute('data-was-hidden')
            }
        }
    };
});
