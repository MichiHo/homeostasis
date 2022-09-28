///////////////////////////////////////////////////////////////////////////////
// AUDIO OBJECTS INIT

const ctx = new (window.AudioContext || window.webkitAudioContext)();

const lead_gain = ctx.createGain();
const friends_gain = ctx.createGain();
const pre_reverb = ctx.createGain();
pre_reverb.gain.value = 1.0;
const master_gain = ctx.createGain();

const lead_filter = ctx.createBiquadFilter();
lead_filter.type = "lowpass";
lead_filter.Q = 5.0;
const friends_filter = ctx.createBiquadFilter();
friends_filter.type = "lowpass";
friends_filter.Q = 5.0;

const reverb = new ReverbSwitcher(ctx, pre_reverb, master_gain)

lead_gain.connect(lead_filter);
lead_filter.connect(pre_reverb);
friends_gain.connect(friends_filter);
friends_filter.connect(pre_reverb);
// pre_reverb connected inside ReverbSwitcher()
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

// const plots = $("#plots");
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
        max: 1,
    },
    tooltips: [wNumb({ suffix: "s", decimals: 2 })],
};
const envelope_slider_prototype = {
    connect: "lower",
    range: {
        min: 0.01,
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

// lead voice glide
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

// lead voice attack
const attack_lead_slider = document.getElementById("ctrl-attack-lead");
noUiSlider.create(attack_lead_slider, {
    ...envelope_slider_prototype,
    start: config.default_sound.attack,
});
attack_lead_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.default_sound.attack = val[0];
    main_voice.attack = val[0];
    changedConfig();
});

// lead voice release
const release_lead_slider = document.getElementById("ctrl-release-lead");
noUiSlider.create(release_lead_slider, {
    ...envelope_slider_prototype,
    start: config.default_sound.release,
});
release_lead_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.default_sound.release = val[0];
    main_voice.release = val[0];
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

// friends glide
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

// friends voice attack
const attack_friends_slider = document.getElementById("ctrl-attack-friends");
noUiSlider.create(attack_friends_slider, {
    ...envelope_slider_prototype,
    start: config.default_sound.attack,
});
attack_friends_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.default_friends_sound.attack = val[0];
    for (let friend of friends) {
        friend.sound.attack = val[0]
    }
    changedConfig();
});

// friends voice release
const release_friends_slider = document.getElementById("ctrl-release-friends");
noUiSlider.create(release_friends_slider, {
    ...envelope_slider_prototype,
    start: config.default_sound.release,
});
release_friends_slider.noUiSlider.on("slide", function (_, handle, val) {
    config.default_friends_sound.release = val[0];
    for (let friend of friends) {
        friend.sound.release = val[0]
    }
    changedConfig();
});

///////////////////////////////////////////////////////////////////////////////
// FRIENDS CONTROLS

function changedNumFriends() {
    for (let i = friends.length - 1; i >= config.friends.num; i--) {
        // delete excess voices
        friends[i].stop();
        $(`#btn-reset-${i}`).remove();
        delete friends[i];
    }
    for (let i = friends.length; i < config.friends.num; i++) {
        // add new voices
        friends.push(new Friend(friends_gain, ctx));
        let prev_btn;
        if (i == 0) {
            prev_btn = $("#btn-reset-all");
        } else {
            prev_btn = $(`#btn-reset-${i - 1}`);
        }
        let new_btn = $(
            `<div class="bottom-btn bottom-ctrl" id="btn-reset-${i}">${i + 1}</div>`
        );
        new_btn.on("click", function (ev) {
            resetFriend(i)
        });
        new_btn.insertAfter(prev_btn);
        if (main_voice.playing) {
            resetFriend(i); // new voice instantly live!
        }
    }
    friends = friends.slice(0, config.friends.num);
    let display_text = ""
    if (config.friends.num < 1) display_text = 'could be friends'
    else if (config.friends.num == 1) display_text = 'is a friend'
    else display_text = `are ${config.friends.num} friends`
    $(".display-num-voices").text(display_text);
    refreshKeyboardVisualizations()
    // friend_plots()
}
function resetFriend(index, play_on = true) {
    console.log(`Reset friend ${index}`)
    friends[index].reset(0, play_on);
    if (play_on && main_voice.playing) {
        newFriendNotes([index])
    }
    refreshKeyboardVisualizations()

}
function resetFriends(play_on = true) {
    for (let friend of friends) {
        friend.reset(0, play_on);
    }
    if (play_on && main_voice.playing) {
        newFriendNotes()
    }
    refreshKeyboardVisualizations()

}
$("#ctrl-num-voices").on("input", function (ev) {
    config.friends.num = Number($(ev.target).val());

    changedNumFriends();
    changedConfig();
});
$("#btn-reset-all").on("click", function (ev) {
    resetFriends(true)
});
$("#btn-reset-config").on("click", function (ev) {
    for (let friend of friends) {
        friend.reset();
    }
    main_voice.stop();
    resetConfig();
    applyConfig();
    changedConfig();
});

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
    config.friends.min_note = Math.floor(values[0]);
    config.friends.max_note = Math.floor(values[1]);
    for (let friend of friends) {
        friend.min_note = config.friends.min_note;
        friend.max_note = config.friends.max_note;
    }
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
        friend.neighbourhood = config.friends.neighbourhood;
    }
    changedConfig();
});

const friends_distance_weight_slider = document.getElementById(
    "ctrl-distance-weight"
);
noUiSlider.create(friends_distance_weight_slider, {
    connect: "lower",
    start: [config.friends.neighbourhood],
    range: {
        min: 0,
        max: 1,
    },
    tooltips: [wNumb({ decimals: 2 })],
});
friends_distance_weight_slider.noUiSlider.on(
    "change",
    function (_, __, values) {
        config.friends.jump_weight = values[0];
        for (let friend of friends) {
            friend.jump_weight = config.friends.jump_weight;
        }
        changedConfig();
    }
);

$("#chk-reset-on-hit").on("change", function (event) {
    config.friends.note_repeat_reset = event.currentTarget.checked;
    changedConfig();
});

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
    let ranges_keyboard = $(".note-range-keyboard-display");
    let width = percent(1.0 / (max_midi_note - min_midi_note));
    for (let i = min_midi_note; i < max_midi_note; i++) {
        let item = $("<li>").attr("id", `range-note-${i}`).css("width", width);
        let midi = midiToNote(i);
        if (midi.includes("#")) item.addClass("range-note-black");
        else item.addClass("range-note-white");
        if (midi[0] == "E" || midi[0] == "B") item.addClass("range-note-needs-sep");
        item.appendTo(ranges_keyboard);
    }
}

let prob_ui = new ProbabilitiesUI("ctrl-probabilities", {
    initial_values: initial_config.friends.probabilities,
    titles: ['reference note', 'minor second', 'major second', 'minor third', 'major third', 'fourth', 'tritone', 'fifth', 'minor sixth', 'major sixth', 'minor seventh', 'major seventh', 'octave']
});
prob_ui.set_probabilities(config.friends.probabilities);
prob_ui.on_change = function (probs, i) {
    config.friends.probabilities = probs;
    for (let friend of friends) {
        friend.probabilities = probs;
    }
    changedConfig();
};


const reverb_amount_slider =
    document.getElementById("ctrl-reverb-amount");
noUiSlider.create(reverb_amount_slider, {
    connect: "lower",
    start: [config.reverb_amount],
    range: {
        min: 0,
        max: 1,
    },
    tooltips: [wNumb({ decimals: 2 })],
});
reverb_amount_slider.noUiSlider.on("slide", function (_, __, values) {
    config.reverb_amount = values[0];
    reverb.setWetAmount(config.reverb_amount)
    changedConfig();
});

// reverb picker TODO
// $('.ctrl-reverb-choice').removeClass('selected')
// if (config.reverb_ir in reverb.impulse_responses){
//     document.getElementById(`ctrl-reverb-choice-${config.reverb_ir}`).classList.add('selected')
// } else {
//     document.getElementById('ctrl-reverb-choice-none').classList.add('selected')
// }
function changedReverbType() {
    $('.ctrl-reverb-choice').removeClass('selected')
    if (config.reverb_ir in reverb.impulse_responses) {
        document.getElementById(`ctrl-reverb-choice-${config.reverb_ir}`).classList.add('selected')
    } else {
        document.getElementById('ctrl-reverb-choice-none').classList.add('selected')
    }
}
{
    let picker = document.getElementById('ctrl-reverb-type')
    let button = document.createElement('button')
    button.textContent = 'None';
    button.className = 'ctrl-reverb-choice'
    button.id = 'ctrl-reverb-choice-none'
    button.onclick = function (ev) {
        config.reverb_ir = ""
        reverb.bypass()
        changedReverbType()
        changedConfig()
    }
    picker.appendChild(button)

    for (let ir_name in reverb.impulse_responses) {
        console.log(ir_name)
        button = document.createElement('button')
        button.textContent = ir_name
        button.id = `ctrl-reverb-choice-${ir_name}`
        button.className = 'ctrl-reverb-choice'
        button.onclick = function (ev) {
            config.reverb_ir = ir_name
            reverb.switchImpulseResponse(ir_name).finally(function () {
                if (reverb.current_impulse_response != config.reverb_ir) {
                    config.reverb_ir = ""
                } else {
                    config.reverb_ir = reverb.current_impulse_response
                }
                changedReverbType()
                changedConfig()
            })
        }
        picker.appendChild(button)
    }

}

document.body.onkeydown = function (event) {
    if (event.keyCode === 160) {
        // reset all
        console.log("Reset all")
        resetFriends(true)
    } else {
        let friend_num = Number.parseInt(event.key)
        if (!Number.isNaN(friend_num) && friend_num >= 0 && friend_num <= friends.length) {
            if (friend_num == 0 && friends.length >= 10) friend_num = 10
            resetFriend(friend_num - 1, true);
        }
    }
}

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
    }

    play(note, gain = 1.0, time = 0) {
        time = time || this.ctx.currentTime;
        let frequency = midiToHertz(note);

        if (!this.playing) {
            this.envelope = ctx.createGain();
            this.envelope.connect(this.outputNode);
            this.envelope.gain.setValueAtTime(0.0, time);
            this.envelope.gain.linearRampToValueAtTime(gain, time + this.attack);

            // new sound
            this.osc = this.ctx.createOscillator();
            this.osc.frequency.setValueAtTime(frequency, time);
            this.osc.type = this.type;
            this.osc.connect(this.envelope);
            this.osc.start(time);
        } else {
            // glide with frequency AND gain :)
            this.osc.frequency.exponentialRampToValueAtTime(
                frequency,
                time + this.glide
            );
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
/** Class for friend voice, with own set of settings. */
class Friend {
    constructor(outputNode, ctx, friendSpec = {}, instrumentSpec = {}) {
        this.latest_probabilities = [];
        this.latest_probabilities_min = 0;
        this.note = 0;
        this.notes_since_reset = 0;
        this.avoid_note = -1;

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

    /** Decide new note and start playing it. Returns new note. */
    newNote(other_notes, time = 0) {
        /*
                Look at set of neighbours around prev_note
                calculate probability and pick best
    
                Done:
                - exclude notes already played by other voices
                - interval probabilities
                - favor small jumps
                
                ToDo (maybe):
                - favor non-extreme pitches
                */

        let min_note;
        let max_note;
        if (this.note <= 0) {
            // Look everywhere for new note
            min_note = this.min_note;
            max_note = this.max_note;
        } else {
            // Look in neighbourhood around prev note
            min_note = Math.max(this.note - this.neighbourhood, this.min_note);
            max_note = Math.min(this.note + this.neighbourhood, this.max_note);
        }

        this.latest_probabilities_min = min_note;

        let bestNotes = [];
        let bestNoteProb = 0.0;
        this.latest_probabilities = [];
        for (let note = min_note; note < max_note; note++) {
            let prob = 1.0;
            if (note == this.avoid_note) {
                console.log(`Avoid ${note}`)
                this.latest_probabilities.push(0.0);
                continue;
            }

            // Interval probabilities
            for (let other of other_notes) {
                if (other <= 0) continue;
                let interv = interval(note, other);
                while (interv > 12) interv -= 12;
                if (interv > 0 && interv < this.probabilities.length) {
                    prob *= this.probabilities[interv];
                } else prob = 0.0;
            }

            // Distance probability impact
            if (this.jump_weight > 0.0 && this.note > 0) {
                prob *=
                    1.0 -
                    this.jump_weight +
                    (this.jump_weight *
                        (this.neighbourhood - interval(note, this.note))) /
                    this.neighbourhood;
            }

            // Store best note(s)
            if (prob == bestNoteProb) {
                bestNotes.push(note);
            } else if (prob > bestNoteProb) {
                bestNoteProb = prob;
                bestNotes = [note];
            }
            this.latest_probabilities.push(prob);
        }

        // Pick one of the best notes
        let bestNote = -1;
        if (bestNotes.length == 1) {
            bestNote = bestNotes[0];
        } else if (bestNotes.length > 0) {
            let ind = Math.floor(Math.random() * bestNotes.length);
            bestNote = bestNotes[ind];
        }
        this.note = bestNote;
        this.avoid_note = -1;
        if (bestNote <= 0) {
            this.sound.stop();
        } else {
            this.sound.play(this.note);
            this.notes_since_reset++;
        }
        return bestNote;
    }
    reset(time = 0, play_on = false, force_new = true) {
        if (force_new) this.avoid_note = this.note;
        this.note = -1;
        if (!play_on) this.sound.stop(time);
        this.notes_since_reset = 0;
    }
    stop(time = 0) {
        this.sound.stop(time);
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
        friend.stop();
    }
}

function refreshKeyboardVisualizations() {
    if (this.large_notes === undefined) {
        this.large_notes = $("#keyboard ul li").toArray();
        this.small_notes = $(`.note-range-keyboard-display li`).toArray();
    }
    // Reset small full keyboard visualization
    for (let obj of this.small_notes) {
        obj.classList.remove(
            "range-note-lead",
            "range-note-friend",
            "range-note-friend-reset"
        );
    }
    // Reset playable keyboard visualization
    for (let obj of this.large_notes) {
        if (obj.getAttribute("data-note-type") == "black") {
            obj.style.backgroundColor = "black";
        } else {
            obj.style.backgroundColor = "white";
        }
        let span = obj.getElementsByClassName('note-voice')
        if (span.length == 1) {
            span[0].remove()
        }
    }

    this.small_notes = [];
    this.large_notes = [];

    let i = -1;
    for (let friend of friends) {
        i++;
        if (friend.note > 0 && friend.sound.playing) {
            let reset_this = friend.notes_since_reset < 2;
            // Playable keyboard visualization
            let large_note = document.getElementById(
                midiToNote(friend.note)//.replace("#", "\\#")
            );
            if (large_note) {
                large_note.style.backgroundColor = reset_this
                    ? config.vis.friend_reset_note_color
                    : config.vis.friend_note_color;
                let span = document.createElement('span')
                span.className = 'note-voice'
                span.textContent = (i + 1).toFixed(0);
                large_note.appendChild(span);
                this.large_notes.push(large_note);
            }

            // Small full keyboard visualization
            let small_note = document.getElementById(`range-note-${friend.note}`);
            small_note.classList.add("range-note-friend");
            small_note.classList.toggle("range-note-friend-reset", reset_this);
            this.small_notes.push(small_note);
        }
    }

    if (main_voice.playing) {
        // Playable keyboard visualization
        let large_note = document.getElementById(
            midiToNote(main_voice.note)
        );
        large_note.style.backgroundColor = config.vis.lead_note_color;
        this.large_notes.push(large_note);

        // Small full keyboard visualization
        let small_note = document.getElementById(`range-note-${main_voice.note}`);
        small_note.classList.add("range-note-lead");
        this.small_notes.push(small_note);
    }
}
function newFriendNotes(indices = null) {

    let notes = [];
    for (let friend of friends) {
        notes.push(friend.note);
    }
    function update(i) {
        console.log(`Update ${i}`)
        let friend = friends[i]
        notes[i] = last_main_note;
        let new_note = friend.newNote(notes);
        notes[i] = new_note;
    }
    if (indices !== null) {
        for (let i of indices) update(i);
    } else {
        for (let i = 0; i < friends.length; i++) update(i);
    }
}
function keyDownHandler(note_str, frequency) {
    let note = noteToMidi(note_str);
    if (config.mode == "chords") {
        main_voice.stop();
        stopFriends();
    }

    // new lead voice
    main_voice.play(note);
    $(`#range-note-${note}`).addClass("range-note-lead");
    if (config.friends.num > 0) {
        // if same note multiple times, reset random friends
        if (last_main_note == note && config.friends.note_repeat_reset) {
            friend_reset_index = (friend_reset_index + 1) % config.friends.num;
            friends[friend_reset_index].reset(0, true)
        } else friend_reset_index = -1;
        last_main_note = note;

        // friend voices
        newFriendNotes(null)
        // friend_plots();
    }
    refreshKeyboardVisualizations();
}
function keyUpHandler(note, frequency) {
    if (noteToMidi(note) == main_voice.note) {
        main_voice.stop();
        stopFriends();
        refreshKeyboardVisualizations();
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
    $("#chk-reset-on-hit").prop("checked", config.friends.note_repeat_reset);
    gain_master_slider.noUiSlider.set(linToDb(config.gain_master));
    gain_lead_slider.noUiSlider.set(linToDb(config.gain_lead));
    gain_friends_slider.noUiSlider.set(linToDb(config.gain_friends));
    cutoff_lead_slider.noUiSlider.set(Math.log10(config.filter_cutoff_lead));
    cutoff_friends_slider.noUiSlider.set(
        Math.log10(config.filter_cutoff_friends)
    );
    glide_lead_slider.noUiSlider.set(config.default_sound.glide);
    glide_friends_slider.noUiSlider.set(config.default_friends_sound.glide);
    attack_lead_slider.noUiSlider.set(config.default_sound.attack)
    release_lead_slider.noUiSlider.set(config.default_sound.release)
    attack_friends_slider.noUiSlider.set(config.default_friends_sound.attack)
    release_friends_slider.noUiSlider.set(config.default_friends_sound.release)
    friends_neighbourhood_slider.noUiSlider.set(config.friends.neighbourhood);
    friends_distance_weight_slider.noUiSlider.set(config.friends.jump_weight);
    reverb_amount_slider.noUiSlider.set(config.reverb_amount);
    changedReverbType();
    changedNumFriends();
    resizeHandler(); // creates keyboard, sets num-octaves
    // friend_plots();
    prob_ui.set_probabilities(config.friends.probabilities);
    $(".controls-section").each(function (i, obj) {
        if (obj.id in config.hidden && config.hidden[obj.id]) {
            obj.classList.add("hidden");
        } else {
            obj.classList.remove("hidden");
        }
    });
    document.body.style.setProperty(
        "--lead-note-color",
        config.vis.lead_note_color
    );
    document.body.style.setProperty(
        "--friend-note-color",
        config.vis.friend_note_color
    );
    document.body.style.setProperty(
        "--friend-reset-note-color",
        config.vis.friend_reset_note_color
    );

    // Value updates
    let t2 = ctx.currentTime + 0.001;
    lead_gain.gain.linearRampToValueAtTime(config.gain_lead, t2);
    friends_gain.gain.linearRampToValueAtTime(config.gain_friends, t2);
    master_gain.gain.linearRampToValueAtTime(config.gain_master, t2);
    lead_filter.frequency.linearRampToValueAtTime(config.filter_cutoff_lead, t2);
    friends_filter.frequency.linearRampToValueAtTime(
        config.filter_cutoff_friends,
        t2
    );
    main_voice.glide = config.default_sound.glide
    main_voice.attack = config.default_sound.attack
    main_voice.release = config.default_sound.release
    for (let friend of friends) {
        friend.sound.glide = config.default_friends_sound.glide
        friend.sound.attack = config.default_friends_sound.attack
        friend.sound.release = config.default_friends_sound.release

        friend.jump_weight = config.friends.jump_weight
        friend.neighbourhood = config.friends.neighbourhood
        friend.min_note = config.friends.min_note;
        friend.max_note = config.friends.max_note;
    }
    reverb.setWetAmount(config.reverb_amount)
    reverb.switchImpulseResponse(config.reverb_ir);
}



const key_names_map = [
    'A',
    'W',
    'S',
    'E',
    'D',
    'F',
    'T',
    'G',
    'Z/Y',
    'H',
    'U',
    'J',
    'K',
    'O',
    'L',
]
function updateKeyboard() {
    delete keyboard;
    $("#keyboard").empty();
    let new_start_note = midiToNote(config.keyboard_start_note).replace("#", ""); // qwerty-hancock only accepts white keys. Remove sharp
    keyboard = new QwertyHancock({
        id: "keyboard",
        width: screen_width - 16, // remove padding
        height: 150,
        octaves: keyboard_octaves,
        startNote: new_start_note,
    });
    // let keymap = keyboard.getKeyMap()
    // let keymap_better = {}
    // for (let vk in KeyboardEvent) {
    //     if (!vk.startsWith('DOM_VK')) continue;
    //     let key_code = KeyboardEvent[vk]

    //     if (key_code in keymap){
    //         let note = keymap[key_code]
    //         keymap_better [vk] = note
    //     }
    // }
    // console.log(keymap_better)
    keyboard.keyDown = keyDownHandler;
    keyboard.keyUp = keyUpHandler;
    $(".display-kbd-range").text((keyboard_octaves * 12 - 1).toFixed(0));
    $("#ctrl-num-octaves").val(keyboard_octaves);

    // Add key codes
    let first_c = nextC(config.keyboard_start_note);
    for (let i = 0; i < key_names_map.length; i++) {
        let note = first_c + i;
        let key = document.getElementById(midiToNote(note))
        let span = document.createElement('span')
        span.textContent = key_names_map[i]
        span.className = 'note-key'
        key.appendChild(span)
    }
    refreshKeyboardVisualizations();
}

function resizeHandler() {
    screen_width = $(window).width();
    keyboard_octaves = Math.floor(
        clamp((screen_width - 300) / config.keyboard_size_factor, 2, 7)
    );
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
    config.keyboard_size_factor = (screen_width - 300) / num;
    changedConfig();
    resizeHandler();
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
            config.hidden[obj.id] = obj.classList.contains("hidden");
            changedConfig();
        })
        .prepend("<span class='hide-icon'></span>");
});
$(".ctrl-hint").each(function (i, obj) {
    let hints = obj.attributes["data-ctrl-hints"].value.split(" ");
    obj.onmouseenter = function (event) {
        for (let hint of hints) {
            // find ctrl
            let obj = document.getElementById(hint);
            while (obj != null && !obj.classList.contains("ctrl")) {
                obj = obj.parentElement;
            }
            if (obj != null) {
                obj.classList.add("ctrl-highlight");
            }
            while (obj != null && !obj.classList.contains("controls-section")) {
                obj = obj.parentElement;
            }
            if (obj != null && obj.classList.contains("hidden")) {
                obj.classList.remove("hidden");
                obj.data_was_hidden = "true";
            }
        }
    };
    obj.onmouseleave = function (event) {
        for (let hint of hints) {
            // find ctrl
            let obj = document.getElementById(hint);
            while (obj != null && !obj.classList.contains("ctrl")) {
                obj = obj.parentElement;
            }
            if (obj != null) {
                obj.classList.remove("ctrl-highlight");
            }
            while (obj != null && !obj.classList.contains("controls-section")) {
                obj = obj.parentElement;
            }
            if (obj != null && obj.data_was_hidden == "true") {
                obj.classList.add("hidden");
                obj.removeAttribute("data-was-hidden");
            }
        }
    };
});

// Enhance number inputs
for (let num_ctrl of document.getElementsByClassName('ctrl-num')) {
    let inputs = num_ctrl.getElementsByTagName('input')
    if (inputs.length != 1) continue
    let input = inputs[0]

    let wrapper = document.createElement('div')
    wrapper.className = 'ctrl-num-wrapper'
    num_ctrl.appendChild(wrapper)

    let dec_btn = document.createElement('button')
    dec_btn.className = 'ctrl-num-btn'
    dec_btn.textContent = '-'
    dec_btn.onclick = function () {
        input.value = Math.max(input.valueAsNumber - 1, Number(input.min))
        console.log(input.value)
        input.dispatchEvent(new Event('input'))
    }
    wrapper.appendChild(dec_btn)

    wrapper.appendChild(input)

    let inc_btn = document.createElement('button')
    inc_btn.className = 'ctrl-num-btn'
    inc_btn.textContent = '+'
    inc_btn.onclick = function () {
        input.value = Math.min(input.valueAsNumber + 1, Number(input.max))
        input.dispatchEvent(new Event('input'))
    }
    wrapper.appendChild(inc_btn)
}
