const ytdl = require("discord-ytdl-core");
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");

let nowPlaying = {};
let queue = [];
let voiceChannel;

const removeQueue = (target) => {
  const arr = [];
  for (let i in queue) {
    if (i == target) continue;
    arr.push(queue[i]);
  }
  queue = arr;
};

const play = () => {
  nowPlaying.stream = ytdl(queue[0], {
    filter: "audioonly",
    opusEncoded: true,
    encoderArgs: ["-af", "bass=g=10,dynaudnorm=f=200"],
  });
  nowPlaying.dispatcher = connection
    .play(nowPlaying.stream, { type: "opus" })
    .on("speaking", (speaking) => {
      if (!speaking) {
        removeQueue(0);
        if (queue.length) play();
        else {
          nowPlaying = {};
        }
      }
    });
};

client.on("ready", () => {
  console.log("ready");
});

client.on("message", (msg) => {
  if (msg.author.bot || !msg.guild) return;
  if (msg.content.startsWith("!p")) {
    if (!msg.member.voice.channel)
      return msg.channel.send("음성 채널에 접속 후 사용할 수 있습니다.");

    queue.push(msg.content.substring(3));
    msg.channel.send("큐에 추가되었습니다.");

    voiceChannel = msg.member.voice.channel;

    if (!nowPlaying.dispatcher) {
      msg.member.voice.channel.join().then((connection) => {
        play();
      });
    }
  } else if (msg.content.startsWith("!q")) {
    let text = "```";
    for (let i in queue) {
      text += `${i} ${queue[i]}\n`;
    }
    text += "```";
    return msg.channel.send(text);
  } else if (msg.content.startsWith("!l")) {
    nowPlaying.dispatcher.destroy();
    nowPlaying = {};
    queue = [];
    voiceChannel.leave();
  } else if (msg.content.startsWith("!rq")) {
    if (msg.content.substring(3) == 0) {
      return msg.channel.send(
        `현재 재생 중인 큐를 건너뛰려면 !n를 사용해주세요.`
      );
    }

    removeQueue(msg.content.substring(3));

    return msg.channel.send(`${msg.content.substring(3)}번 큐를 제거했습니다.`);
  } else if (msg.content.startsWith("!n")) {
    removeQueue(0);
    if (queue[0]) {
      play();
    } else {
      nowPlaying.dispatcher.destroy();
      nowPlaying = {};
    }
  }
});

client.login(config.token);
