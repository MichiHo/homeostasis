///////////////////////////////////////////////////////////////////////////////
// CONFIG
const probabilities_size = 13;

/** Fix errors in configs from older versions */
function sanitizeConfigInPlace(config) {
    if (config.friends.probabilities.length != probabilities_size) {
        console.log("sanitize probs");
        delete config.friends.probabilities;
    }
    config.friends.num = Number(config.friends.num)
	if (modes.indexOf(config.mode) == -1) config.mode = "chords";
	
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
            return result;
        }
    }
    return {};
}
/**
 * Called on config change through UI - only save
 */
var configChangeTimer;

/** Called when config was changed to store updated version. */
function changedConfig() {
    clearTimeout(configChangeTimer);
    configChangeTimer = setTimeout(storeConfig, 500);
}

const min_midi_note = 20;
const max_midi_note = 108;
const modes = ["chords", "glide"];

// Default config
var config = {
    gain_lead: 0.2,
    filter_cutoff_lead: 500.0,
    filter_cutoff_friends: 400.0,
    gain_friends: 0.1,
    gain_master: 1.0,
	reverb_amount: 0.0,
	reverb_ir: "",
    keyboard_start_note: 48, // A3
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
        min_note: 61,
        max_note: 78,
        num: 2,
        neighbourhood: 8,
        jump_weight: 0.35, // impact of jump width (relative to neighbourhood)
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
		lead_note_color: 'yellow',
		friend_note_color: 'green',
		friend_reset_note_color: 'lightgreen'
    },
    hidden: {
		'controls-note-ranges': true,
		'controls-reverb': true
    }
};
const initial_config = deepmerge(config, {})

const hiding_order = [
	[1688,'controls-mixer'],
	[1444,'controls-probabilities'],
	[1106,'controls-friends']
]
function configApplyHidingOrder(config){
	let screen_width = $(window).width();
	for(let hide of hiding_order) {
		console.log(hide)
		if (screen_width < hide[0]) {
			config.hidden[hide[1]] = true;
			console.log(`Hide ${hide[1]}`)
		}
	}
}

// Load from cookie and merge with default
{
	let loaded_config = loadConfig()
	if (! 'hidden' in loaded_config){
		configApplyHidingOrder(loaded_config);
	}
	config = deepmerge(initial_config, loaded_config, {
		arrayMerge: function (destinationArray, sourceArray, options) {
			return sourceArray;
		}, // overwrite arrays instead of concat
	});
}
function resetConfig() {
	config = deepmerge(initial_config, {});
	configApplyHidingOrder(config)
}