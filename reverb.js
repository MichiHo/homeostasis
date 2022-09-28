
function ReverbSwitcher(context, in_node, out_node) {
	let this_ = this;
	this.impulse_responses = {
		'Light': 'LittlefieldLobby.wav',
		'Dark': '3000CStreetGarageStairwell.wav',
		'Weird': 'TunnelToHell.wav',
		'Short': 'MillsGreekTheater.wav'
	}
	this.convolvers = {}
	this.input = in_node
	this.output = out_node
	this.current_impulse_response = ""

	/* 
	When active:
	-	in -> convolve -> gain_wet -> out
	-	in -> gain_dry -> out
	When bypassed:
	-	in -> out
	*/

	this.wet_gain = context.createGain()
	this.dry_gain = context.createGain()

	this.wet_gain.connect(this.output)
	this.input.connect(this.dry_gain)
	this.dry_gain.connect(this.output)

	/** Switch to the named IR, or bypass if name not known */
	this.switchImpulseResponse = async function (name = "") {
		if (name in this_.impulse_responses) {
			let filename = this_.impulse_responses[name]
			if (!(name in this_.convolvers)) {
				// Load IR
				try {
					let convolver = context.createConvolver()
					let response = await fetch(`https://michaelhochmuth.de/homeostasis/impulse_responses/${filename}`);
					let arraybuffer = await response.arrayBuffer();
					convolver.buffer = await context.decodeAudioData(arraybuffer);
					convolver.connect(this.wet_gain)
					this_.convolvers[name] = convolver
				} catch (err) {
					console.log(`Could not load Impulse Response ${name}`)
					console.error(err);
					delete this_.impulse_responses[name]
					this_.bypass()
					return;
				}
			} 
			this_.input.disconnect()
			this_.input.connect(this_.convolvers[name])
			this_.input.connect(this_.dry_gain)
			this_.current_impulse_response = name
		} else {
			this_.bypass()
		}
	}
	this.bypass = function () {
		this_.input.disconnect()
		this_.input.connect(this_.output)
		this_.current_impulse_response = ""
	}

	/** Set amount of wet signal. At 1.0 only reverb and 0.0 only input. */
	this.setWetAmount = function (amt, time = 0) {
		time = time || context.currentTime;
		amt = clamp(amt, 0.0, 1.0)
		this_.wet_gain.gain.linearRampToValueAtTime(amt, time + 0.001)
		this_.dry_gain.gain.linearRampToValueAtTime(1.0 - amt, time + 0.001)
	}

	this.switchImpulseResponse("");
	this.setWetAmount(0.0);
}