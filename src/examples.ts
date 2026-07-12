import awsSg from "./examples/aws-sg.txt?raw";
import bwgMegabox from "./examples/bwg-megabox.txt?raw";
import dmitCorona from "./examples/dmit-corona.txt?raw";
import dmitMalibu from "./examples/dmit-malibu.txt?raw";
import evoxtMalaysiaEveningPeak from "./examples/evoxt-malaysia-evening-peak.txt?raw";
import gomamiHkgTurinMini from "./examples/gomami-hkg-turin-mini.txt?raw";
import hostdzireNetherlandsDedicated from "./examples/hostdzire-netherlands-dedicated.txt?raw";
import isvoroHkCn2 from "./examples/isvoro-hk-cn2.txt?raw";
import vmissLaxTriBasic from "./examples/vmiss-lax-tri-basic.txt?raw";
import xianyuyunFrankfurtCn2Gia from "./examples/xianyuyun-frankfurt-cn2gia-1c2g14g.txt?raw";
import awsSgBackground from "./assets/example-cards/aws-sg.webp";
import bwgMegaboxBackground from "./assets/example-cards/bwg-megabox.webp";
import dmitCoronaBackground from "./assets/example-cards/dmit-corona.webp";
import dmitMalibuBackground from "./assets/example-cards/dmit-malibu.webp";
import vmissLaxBackground from "./assets/example-cards/vmiss-lax.webp";

export const reportExamples = [
  { name: "BWG MegaBox", report: bwgMegabox, background: bwgMegaboxBackground },
  { name: "DMIT LAX.AN4.PRO.Malibu", report: dmitMalibu, background: dmitMalibuBackground },
  { name: "VMISS US.LAX.TRI.Basic", report: vmissLaxTriBasic, background: vmissLaxBackground },
  { name: "DMIT LAX.AN4.EB.Corona", report: dmitCorona, background: dmitCoronaBackground },
  { name: "AWS SG", report: awsSg, background: awsSgBackground },
  { name: "Hostdzire NL Dedicated", report: hostdzireNetherlandsDedicated, background: dmitCoronaBackground },
  { name: "Isvoro HK CN2", report: isvoroHkCn2, background: awsSgBackground },
  { name: "咸鱼云 Frankfurt CN2GIA 1C2G14G", report: xianyuyunFrankfurtCn2Gia, background: dmitMalibuBackground },
  { name: "Evoxt Malaysia 晚高峰", report: evoxtMalaysiaEveningPeak, background: awsSgBackground },
  { name: "狗妈咪 HKG.Turin.Mini", report: gomamiHkgTurinMini, background: awsSgBackground },
];
