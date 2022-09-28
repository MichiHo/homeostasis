(function () {
	var root = this;

	var percent = function(number) {
		return `${(number*100).toFixed(2)}%`
	}

	const notes = [
		"C",
		"C#",
		"D",
		"D#",
		"E",
		"F",
		"F#",
		"G",
		"G#",
		"A",
		"A#",
		"B",
	];


	var ProbabilitiesUI = function (id, settings) {
		this.container = document.getElementById(id);
		this.on_change = function (probabilities, index) { }
		let this_object = this;
		
		
		let user_settings = settings || {};
		this.settings = {
			notes: user_settings.notes || 13,
			fix_values: user_settings.fix_values || { 0: 0 },
			first_note: user_settings.first_note || "C",
			initial_values: user_settings.initial_values || [],
			titles: user_settings.titles || []
		};
		this.probabilities = []

		this.ul = document.createElement("ul");
		if (this.container.querySelector("ul")) {
			this.container.replaceChild(this.ul, this.container.querySelector("ul"));
		} else {
			this.container.appendChild(this.ul);
		}

		let index_offset = notes.indexOf(this.settings.first_note);
		if (index_offset === -1) {
			index_offset = 0;
			this.settings.first_note = "C";
		}
		this.bars = []
		let css_prefix = 'probabilities_widget'
		let width = percent(1/this.settings.notes)
		// Create "keys"
		let mousedown_key = false, mousedown_i = -1;
		for (let i = 0; i < this.settings.notes; i++) {
			if (i in this.settings.fix_values) this.probabilities.push(this.settings.fix_values[i])
			else if (i < this.settings.initial_values.length) this.probabilities.push(this.settings.initial_values[i])
			else this.probabilities.push(0)
			let note_index = (i + index_offset) % 12;
			let note = notes[note_index];
			let black_key = note.includes('#');
			let needs_sep = note[0] == 'B' || note[0] == 'E'

			let key = document.createElement('li')
			key.classList.add(css_prefix + '-key')
			if (black_key) key.classList.add(css_prefix + '-black-key')
			else key.classList.add(css_prefix + '-white-key')
			if (needs_sep) key.classList.add(css_prefix+'-key-sep')
			if (this.settings.titles.length > i) key.title = this.settings.titles[i]
			if (i in this.settings.fix_values) key.classList.add(css_prefix+'-fixed-key')
			key.style.width = width
			this.ul.appendChild(key);

			let bar = document.createElement('div')
			bar.classList.add(css_prefix + '-bar')
			bar.style.height = percent(this.probabilities[i]);
			key.appendChild(bar)
			this.bars.push(bar)

			key.onmousedown = function(event) {
				if (mousedown_i == -1 && !(i in this_object.settings.fix_values)){
					mousedown_i = i;
					mousedown_key = key;
					mousedown_key.classList.add(css_prefix+'-key-active')
					this_object.container.classList.add(css_prefix+'-active')
					let rect = mousedown_key.getBoundingClientRect();
					let position = Math.max(Math.min((rect.bottom - event.clientY) / rect.height,1.0),0.0);
					this_object.probabilities[mousedown_i] = position;
					this_object.bars[mousedown_i].style.height = percent(position)
				}
			}
		}
		this.container.onmousemove = function(event) {
			if (mousedown_i >= 0) {
				let rect = mousedown_key.getBoundingClientRect();
				let position = Math.max(Math.min((rect.bottom - event.clientY) / rect.height,1.0),0.0);
				this_object.probabilities[mousedown_i] = position;
				this_object.bars[mousedown_i].style.height = percent(position)
			}
		}
		this.container.onmouseleave = function(event) {
			if (mousedown_i >= 0) {
				this_object.on_change(this_object.probabilities,mousedown_i);
				mousedown_key.classList.remove(css_prefix+'-key-active')
				this_object.container.classList.remove(css_prefix+'-active')
			}
			mousedown_i = -1
		}
		this.container.onmouseup = function(event) {
			if (mousedown_i >= 0){
				this_object.on_change(this_object.probabilities,mousedown_i);
				mousedown_key.classList.remove(css_prefix+'-key-active')
				this_object.container.classList.remove(css_prefix+'-active')
			}
			mousedown_i = -1
		}
		this.update_view = function() {
			for (let i = 0; i < this_object.settings.notes; i++) {
				this_object.bars[i].style.height = percent(this_object.probabilities[i])
			}
		}
		this.set_probabilities = function(probabilities) {
			if (probabilities.length != this_object.settings.notes) {
				console.log("Invalid probabilities!")
				console.log(probabilities);
				return;
			}
			this_object.probabilities = probabilities;
			this_object.update_view()
		}

		if (this.settings.initial_values.length == this.settings.notes){
			let reset_btn = document.createElement('a')
			reset_btn.text = 'Reset to default'
			reset_btn.onclick = function(event) {
				this_object.set_probabilities(this_object.settings.initial_values)
				this_object.on_change(this_object.probabilities,-1);
			}
			this.container.append(reset_btn)
		}
		this.update_view();
	};

	if (typeof exports !== "undefined") {
		if (typeof module !== "undefined" && module.exports) {
			exports = module.exports = ProbabilitiesUI;
		}
		exports.ProbabilitiesUI = ProbabilitiesUI;
	} else {
		root.ProbabilitiesUI = ProbabilitiesUI;
	}
})(this);
