import type { CommandDefinition } from "../../types.js";
import play from "./play.js";
import lyrics from "./lyrics.js";
import lyricssearch from "./lyricssearch.js";
import musicinfo from "./musicinfo.js";
import artist from "./artist.js";
import album from "./album.js";
import track from "./track.js";
import searchmusic from "./searchmusic.js";
import youtube from "./youtube.js";
import video from "./video.js";
import download from "./download.js";
import audio from "./audio.js";
import voice from "./voice.js";
import sticker from "./sticker.js";
import unsticker from "./unsticker.js";
import toimage from "./toimage.js";
import totext from "./totext.js";
import screenshot from "./screenshot.js";
import thumbnail from "./thumbnail.js";
import resize from "./resize.js";
import crop from "./crop.js";
import blur from "./blur.js";
import enhance from "./enhance.js";
import compress from "./compress.js";
import media from "./media.js";

export const mediaCommands: CommandDefinition[] = [
  play,
  lyrics,
  lyricssearch,
  musicinfo,
  artist,
  album,
  track,
  searchmusic,
  youtube,
  video,
  download,
  audio,
  voice,
  sticker,
  unsticker,
  toimage,
  totext,
  screenshot,
  thumbnail,
  resize,
  crop,
  blur,
  enhance,
  compress,
  media,
];
