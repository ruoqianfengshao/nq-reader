import awsSg from "./examples/aws-sg.txt?raw";
import bwgMegabox from "./examples/bwg-megabox.txt?raw";
import dmitCorona from "./examples/dmit-corona.txt?raw";
import dmitMalibu from "./examples/dmit-malibu.txt?raw";
import vmissLaxTriBasic from "./examples/vmiss-lax-tri-basic.txt?raw";
import awsSgBackground from "./assets/example-cards/aws-sg.png";
import bwgMegaboxBackground from "./assets/example-cards/bwg-megabox.png";
import dmitCoronaBackground from "./assets/example-cards/dmit-corona.png";
import dmitMalibuBackground from "./assets/example-cards/dmit-malibu.png";
import vmissLaxBackground from "./assets/example-cards/vmiss-lax.png";

export const reportExamples = [
  { name: "BWG MegaBox", report: bwgMegabox, background: bwgMegaboxBackground },
  { name: "DMIT LAX.AN4.PRO.Malibu", report: dmitMalibu, background: dmitMalibuBackground },
  { name: "VMISS US.LAX.TRI.Basic", report: vmissLaxTriBasic, background: vmissLaxBackground },
  { name: "DMIT LAX.AN4.EB.Corona", report: dmitCorona, background: dmitCoronaBackground },
  { name: "AWS SG", report: awsSg, background: awsSgBackground },
];
