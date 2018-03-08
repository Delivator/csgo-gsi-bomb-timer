const chalk = require("chalk"),
      http = require("http"),
      https = require("https"),
      fs = require("fs");

const port = 3303,
      host = "127.0.0.1",
      bombTime = 40;

let planted = false,
		plantTime = 0,
		timerStarted = false,
		tickingSince = 0,
		timeLeft = 0,
    roundOver = false;

function createCfg(path) {
  let url = "https://github.com/Delivator/csgo-gsi-bomb-timer/raw/master/gamestate_integration_bombtimer.cfg";
  https.get(url, (res) => {
    res.on("data", (d) => {
      fs.writeFile(path, d, (err) => {
        if (err) throw err;
        console.log(chalk.green("Successfully created ") + path);
      });
    });
  }).on("error", (e) => {
    console.error(e);
  });
}

function checkForCfg() {
  let path = ":\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\csgo\\cfg",
      driveLetters = ["C", "D", "F", "G"];
  for (let i = 0; i < driveLetters.length; i++) {
    let path_ = driveLetters[i] + path;
    if (fs.existsSync(path_)) {
      path_ = path_ + "\\gamestate_integration_bombtimer.cfg"
      if (fs.existsSync(path_)) {
        console.log(chalk.green("Found a gsi-cfg at: ") + path_);
      } else {
        console.log(chalk.red("No gsi-cfg found, creating one at: ") + path_);
        createCfg(path_);
      }
    }
  }
}

checkForCfg()

// Main loop
setInterval(() => {
	if (planted && !timerStarted) {
		timerStarted = true;
		plantTime = new Date().getTime();
	}

	if (planted && timerStarted) {
		let time = new Date().getTime();
		if (time - (bombTime*1000) > plantTime) timerStarted = false;
		tickingSince = (time - plantTime);
		timeLeft = (bombTime * 1000) - tickingSince;
		process.stdout.write("Time left: " + chalk.blue(timeLeft/1000 + "s "));
		if (timeLeft > 10000) {
			console.log("Defusable: " + chalk.green("yes"));
		} else if (timeLeft < 10000 && timeLeft > 5000) {
			console.log("Defusable: " + chalk.yellow("kit only"));
		} else if (timeLeft < 5000) {
			console.log("Defusable: " + chalk.red("no"));
		}
	}
}, 10);

function processPayload(payload) {
	payload = JSON.parse(payload);
	if (payload.round) {
		if (payload.round.bomb && payload.round.bomb === "planted") planted = true;
		if (payload.round.phase === "freezetime" || payload.round.phase === "over") {
			timerStarted = false;
			planted = false;
			if (payload.round.phase === "over" && !roundOver) {
				console.log(chalk.cyan("Round over!"));
				roundOver = true;
			};
			if (payload.round.phase === "freezetime") {
				roundOver = false;
			}
		};
	}
}

// HTTP Server for reciving the payloads from CSGO
let server = http.createServer(function (req, res) {
	var body = "";

	req.on("data", function (data) {
		body += data;
	});

	req.on("end", function () {
		processPayload(body);
		res.end("");
	});
});

server.listen(port, host);
console.log("Listening at http://" + host + ":" + port);
