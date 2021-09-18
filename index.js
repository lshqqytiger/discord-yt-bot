const ytdl = require("discord-ytdl-core");
const yts = require("yt-search");
const Discord = require("discord.js");
const Disbut = require("discord-buttons");
const client = new Discord.Client();
const config = require("./config.json");

let nowPlaying = {};
let queue = [];
let connection;
let searchResults = [];

const removeQueue = (target) => {
  const arr = [];
  for (let i in queue) {
    if (i == target) continue;
    arr.push(queue[i]);
  }
  queue = arr;
};

const play = () => {
  if (!connection)
    return console.error(
      "봇이 음성 채널과 연결되어 있지 않아 재생에 실패했습니다."
    );

  nowPlaying.stream = ytdl(queue[0], config.ytdlConfig);
  nowPlaying.dispatcher = connection
    .play(nowPlaying.stream, { type: config.dispatcherType })
    .on("speaking", (speaking) => {
      if (!speaking) {
        if (nowPlaying.paused) return;
        if (nowPlaying.loop) return play();
        removeQueue(0);
        if (queue.length) play();
        else {
          nowPlaying = {};
        }
      }
    });
  nowPlaying.dispatcher.setVolume(
    nowPlaying.volume || (nowPlaying.volume = config.defaultVolume)
  );
};

Disbut(client);

client.on("ready", () => {
  console.log("ready");
});

client.on("message", async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  if (msg.content.startsWith("!pause")) {
    if (!nowPlaying.paused)
      return msg.channel.send(
        new Discord.MessageEmbed()
          .setTitle("오류!")
          .setDescription("이미 일시 정지 상태입니다.")
      );
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

    if (msg.content.includes("youtube.com/watch?v=")) {
      const url = msg.content.substring(msg.content.startsWith("!pp") ? 4 : 3);

      queue.push(url);
      msg.channel.send(
        new Discord.MessageEmbed()
          .setTitle("곡 추가됨")
          .setDescription(`${url}`)
      );
    } else {
      msg.member.voice.channel.join().then((_) => {
        connection = _;
      });
      searchResults = (
        await yts(msg.content.substring(msg.content.startsWith("!pp") ? 4 : 3))
      ).videos;
      if (!searchResults.length)
        return msg.channel.send(
          new Discord.MessageEmbed()
            .setTitle("검색 결과")
            .setDescription("검색 결과가 없습니다.")
        );

      let text = "";
      let row = new Disbut.MessageActionRow();

      for (let i in searchResults) {
        i = Number(i);
        if (i == 5) break;
        text += `${i + 1} [${searchResults[i].title}](${
          searchResults[i].url
        })\n`;
        row.addComponents(
          new Disbut.MessageButton()
            .setLabel(i + 1)
            .setStyle("blurple")
            .setID(`searchResult${i}`)
        );
      }

      msg.channel.send(
        new Discord.MessageEmbed().setTitle("검색 결과").setDescription(text),
        row
      );
    }
    if (!nowPlaying.dispatcher && queue[0]) {
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
    return msg.channel.send(
      new Discord.MessageEmbed().setTitle("현재 재생 정보").addFields(
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
      )
    );
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
    if (!nowPlaying.paused)
      return msg.channel.send(
        new Discord.MessageEmbed()
          .setTitle("오류!")
          .setDescription("이미 재생 중입니다.")
      );
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
            value:
              "큐에 곡을 추가합니다.\n유튜브 URL을 직접 입력하거나 검색어를 입력합니다.",
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
client.on("clickButton", async (button) => {
  queue.push(searchResults[button.id.substring(12)].url);
  button.reply.send(
    new Discord.MessageEmbed()
      .setTitle("곡 추가됨")
      .setDescription(`${searchResults[button.id.substring(12)].title}`)
  );
  if (!nowPlaying.dispatcher) play();
});

client.login(config.token);
