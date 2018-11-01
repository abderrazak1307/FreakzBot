exports.cleanup = function(message,time){
	message.delete(time);
}
exports.pickColor = function(colorID){// PICK COLOR FROM ITEM QUALITY
	switch(colorID){
		case "color-q6":
			return 0xe5cc80;
			break;
		case "color-q5":
			return 0xff8000;
			break;
		case "color-q4":
			return 0xa335ee;
			break;
		case "color-q3":
			return 0x0070dd;
			break;
		case "color-q2":
			return 0x1eff00;
			break;
		case "color-q1":
			return 0xffffff;
			break;
		case "color-q0":
			return 0x9d9d9d;
		break;
		default:
			return 3447003;
			break;
	}
}