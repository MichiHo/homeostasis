
$("#ctrl-show-plots").on("input", (ev) => {
	config.vis.friend_plots = $(ev.target).prop("checked");
	friend_plots()
	changedConfig()
});

function friend_plots() {
	plots.empty();
	if (!config.vis.friend_plots) return;
	let plot_width = screen_width - 50;
	let total_min = config.friends.max_note,
		total_max = config.friends.min_note;

	// Find data range to include all plots in the x-limits
	for (let friend of friends) {
		if (friend.note > 0) {
			total_min = min(total_min, friend.latest_probabilities_min);
			total_max = max(total_max, friend.latest_probabilities_min + friend.latest_probabilities.length);
		}
	}

	let bar_width = plot_width / (total_max - total_min + 1);
	let friend_i = -1;
	for (let friend of friends) {
		friend_i++;
		let plot = $("<div class='probs-plot'>")
			.css("height", config.vis.friend_plot_height)
			.css("width", plot_width)
			.appendTo(plots);
		plot.append(`<span class='probs-plot-title'>Friend ${friend_i}</span>`);

		if (friend.note === 0) {
			plot.addClass("probs-plot-lost-voice");
			continue;
		}

		// Find maximum probability
		let max_prob = 0.0;
		for (let p of friend.latest_probabilities) max_prob = max(max_prob, p);

		// Axis extrema
		if (friend_i == friends.length-1){
			plot.append(
				`<span class="probs-plot-axis-label probs-plot-xaxis-min">${total_min}</span>`
			).appendTo(plot);
			plot.append(
				`<span class="probs-plot-axis-label probs-plot-xaxis-max">${total_max}</span>`
			).appendTo(plot);
		}
		// plot.append(
		// 	`<span class="probs-plot-axis-label probs-plot-yaxis-min">${0}</span>`
		// ).appendTo(plot);
		// plot.append(
		// 	`<span class="probs-plot-axis-label probs-plot-yaxis-max">${max_prob.toFixed(
		// 		3
		// 	)}</span>`
		// ).appendTo(plot);

		// Friend notes
		for (let note_i = 0; note_i < friend.latest_probabilities.length; note_i++) {
			let left_x = (friend.latest_probabilities_min + note_i - total_min) * bar_width;
			let bar = $(`<div class="probs-plot-bar">`)
				.css("width", bar_width)
				.css("left", left_x)
				.css("height", (friend.latest_probabilities[note_i] / max_prob) * config.vis.friend_plot_height);
			if (friend.latest_probabilities_min + note_i == friend.note) bar.addClass('probs-plot-own')
			bar.appendTo(plot);
		}

		// // Ticks (no labels)
		// for (note = total_min; note <= total_max; note += 2) {
		// 	$(`<div class="probs-plot-xtick">`)
		// 		.css("left", (note - total_min) * bar_width)
		// 		.appendTo(plot);
		// }
	}
	let piano_roll = $('<div>').addClass("piano-roll").appendTo(plots)
	// Piano roll
	for (let note = total_min; note <= total_max; note += 1) {
		let piano_note = $(`<div>`)
			.css("left", (note - total_min) * bar_width)
			.css("width", bar_width)
		if (midiToNote(note).length===3) piano_note.addClass('black-note')
		piano_note.appendTo(piano_roll);
	}
}