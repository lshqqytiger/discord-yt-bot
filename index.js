const ytdl = require("discord-ytdl-core");
const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");

let nowPlaying = {};
let queue = [];
let connection;

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
        if (nowPlaying.loop) return play();
        removeQueue(0);
        if (queue.length) play();
        else {
          nowPlaying = {};
        }
      }
    });
  nowPlaying.dispatcher.setVolume(nowPlaying.volume || 1);
};

client.on("ready", () => {
  console.log("ready");
});

client.on("message", (msg) => {
  if (msg.author.bot || !msg.guild) return;
  if (msg.content.startsWith("!pause")) {
    nowPlaying.paused = true;
    nowPlaying.dispatcher.pause();
    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("일시 정지")
        .setDescription("재생 중인 곡을 일시 정지했습니다.")
    );
  } else if (msg.content.startsWith("!p")) {
    if (!msg.member.voice.channel)
      return msg.channel.send(
        new Discord.MessageEmbed()
          .setTitle("오류!")
          .setDescription("음성 채널 접속 후 사용하실 수 있습니다.")
      );

    let url = msg.content.substring(msg.content.startsWith("!pp") ? 4 : 3);

    queue.push(url);
    msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("큐에 추가됨")
        .setDescription(`${url}`)
    );

    if (!nowPlaying.dispatcher) {
      msg.member.voice.channel.join().then((_) => {
        connection = _;
        play();
      });
    }
  } else if (msg.content.startsWith("!q")) {
    let text = "```";
    for (let i in queue) {
      text += `${i} ${i == "0" ? "→" : ""} ${queue[i]}\n`;
    }
    text += "```";
    return msg.channel.send(
      new Discord.MessageEmbed().setTitle("현재 큐 목록").setDescription(text)
    );
  } else if (msg.content.startsWith("!np")) {
    let embed = new Discord.MessageEmbed().setTitle("현재 재생 정보").addFields(
      {
        name: "상태",
        value: !nowPlaying.dispatcher
          ? "정지됨"
          : nowPlaying.paused
          ? "일시 정지됨"
          : "재생 중",
      },
      {
        name: "곡 URL",
        value: queue[0] || "재생 중이 아님",
      },
      {
        name: "반복",
        value: nowPlaying.loop ? "켬" : "끔",
      },
      {
        name: "볼륨",
        value: nowPlaying.volume
          ? `${nowPlaying.volume} (${nowPlaying.volume * 100}%)`
          : "재생 중이 아님",
      }
    );
    return msg.channel.send(embed);
  } else if (msg.content.startsWith("!leave")) {
    if (nowPlaying.dispatcher) nowPlaying.dispatcher.destroy();
    nowPlaying = {};
    queue = [];
    msg.guild.voice.channel.leave();
  } else if (msg.content.startsWith("!l")) {
    nowPlaying.loop = !nowPlaying.loop;

    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("곡 반복")
        .setDescription(`곡 반복을 ${nowPlaying.loop ? "켰" : "껐"}습니다.`)
    );
  } else if (msg.content.startsWith("!rq")) {
    if (msg.content.substring(3) == 0) {
      return msg.channel.send(
        new Discord.MessageEmbed()
          .setTitle("오류!")
          .setDescription("현재 재생 중인 큐를 건너뛰려면 !n를 사용해주세요.")
      );
    }

    removeQueue(msg.content.substring(4));

    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("곡 제거됨")
        .setDescription(`${msg.content.substring(4)}번 큐를 제거했습니다.`)
    );
  } else if (msg.content.startsWith("!n")) {
    removeQueue(0);
    if (queue[0]) play();
    else {
      if (nowPlaying.dispatcher) nowPlaying.dispatcher.destroy();
      nowPlaying = {};
    }
    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("다음 곡 재생")
        .setDescription(
          queue[0]
            ? `다음 곡으로 넘어갑니다.\n현재 재생 중: ${queue[0]}`
            : "넘어갈 다음 곡이 큐에 없어 재생을 종료합니다.\n!p 또는 !pp 명령어를 사용해 큐에 곡을 추가해주세요."
        )
    );
  } else if (msg.content.startsWith("!v")) {
    nowPlaying.volume = Number(msg.content.substring(3));

    if (nowPlaying.dispatcher)
      nowPlaying.dispatcher.setVolume(nowPlaying.volume || 1);

    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle(nowPlaying.dispatcher ? "볼륨 설정" : "오류!")
        .setDescription(
          nowPlaying.dispatcher
            ? `볼륨을 ${msg.content.substring(3)}(${
                Number(msg.content.substring(3)) * 100
              }%)로 설정했습니다.`
            : "음악이 재생되기 전에는 볼륨을 설정할 수 없습니다."
        )
    );
  } else if (msg.content.startsWith("!resume")) {
    nowPlaying.paused = false;
    nowPlaying.dispatcher.resume();
    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("일시 정지 해제")
        .setDescription("재생 중인 곡을 일시 정지 해제했습니다.")
    );
  } else if (msg.content.startsWith("!help")) {
    return msg.channel.send(
      new Discord.MessageEmbed()
        .setTitle("도움말")
        .addFields(
          {
            name: "!p !pp",
            value: "큐에 곡을 추가합니다.",
          },
          {
            name: "!q",
            value: "현재 큐를 확인합니다.",
          },
          {
            name: "!rq",
            value: "특정 큐를 제거합니다.",
          },
          {
            name: "!l",
            value: "반복 재생을 켜거나 끕니다.",
          },
          {
            name: "!v",
            value: "볼륨을 설정합니다.",
          },
          {
            name: "!n",
            value: "다음 곡으로 넘어갑니다.",
          },
          {
            name: "!pause !resume",
            value: "일시 정지하거나 해제합니다.",
          },
          {
            name: "!np",
            value: "현재 재생 정보를 확인합니다.",
          }
        )
        .setFooter("Copyright (c) 2021 베프")
    );
  }
});

client.login(config.token);
