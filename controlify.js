
var controlify={};

var osc = require('omgosc');
controlify.defaults=defaults={
		/*defult values for each controller,based on MIDI CCs*/
		controllers:{
			buttons:{play:120,stop:121,pause:122},
			sliders:{delay:104,reverb:105,flanger:102}
		},
		notes:{
			scale:{"A":57,"A#":58,"B":59,"C":60,"C#":61,"D":62,"D#":63,"E":64,"F":65,"F#":66,"G":67,"G#":68}
		},
		port:7777,
		host:'127.0.0.1'
};

var sender = new osc.UdpSender(controlify.defaults.host, controlify.defaults.port);

controlify.OSCreceiver=function(port){
	return new osc.UdpReceiver(port);
}

controlify.OSCsender=function(host,port){
	var sender = new osc.UdpSender(host,port);
	return sender;
}

controlify.setProperties=function(properties){
	/*Set the defaults to be used in this module
	this resets the ones above
	@param properties : all properties to be added
	*/
	for(property in properties){
		controlify.defaults[property]=properties[property];
	}
};


controlify.createControllers=function (text,mods){
	/*
	return a list of all controllers detected in text

	@param text 		: string , text to search
	@param mods
		@value type 	: string , specific type of controllers to search, all by default
		@value velocity : number or string , value of velocity or method to create it

	@return controllers : object , dictionary of all controllers
	*/

	mods=(mods===undefined)?{}:mods;
	var type=mods.type;

	var controllers=defaults.controllers;
	var controllers_detected;
	var velocity=mods.velocity;
	if(typeof(type)==='undefined'){
		controllers_detected={};
			//get all types of controllers
		for (controllerType in controllers){
			var _detectedByType=controllers[controllerType];
			var detectedByType=[];
			//get all controllers by type
			for (control in _detectedByType){
				var detected=text.match(control);
				if (detected != null){
					velocity=(typeof velocity ==='number')?velocity:controlify.createVelocity(text,mods);
					var cc=[control,_detectedByType[control],velocity]
					detectedByType.push(cc);
				}
			}
			controllers_detected[controllerType]=detectedByType;
		}
	}
	else{
		controllers_detected=[];
		if (typeof(controllers[type])!=='undefined'){
			for (control in controllers[type]){
				var detected=text.match(control);
				if (detected != null){
					velocity=(typeof velocity ==='number')?velocity:controlify.createVelocity(text,mods);
					var cc=[control,controllers[type][control],velocity]
					controllers_detected.push(cc);
				}
			}					
		}
		else{
			//return empty array if not a type of controller
			controllers_detected=[]
		}
	}

	return controllers_detected	
};

controlify.createNotes=function (text,mods){
	/*
	Creates Notes from each letter in the text
	
	@param  text 			: string , text to be broken into letters and create notes
	@param mods
		@value 	octave 		: int , add or substract ocatves to current note		
		@value  type 		: string , type of value, normal scale or alphabet scale
		@value velocity 	: string or number ,set velocity or method to create velocity	

	@return notes_detected 	: array  , of note values
		
	create_notes_fromText('Testing') -> [19, 4, 18, 19, 8, 13, 6]
	*/
	var octave,type;
	if(mods){
		octave=mods.octave;
		type=mods.type;
	}		

	var notes_detected=[]
	var allchars=text.toLowerCase();
	for (var i = 0; i < allchars.length; i++) {
		var toConvert;
		if (type==="scale"){
			//check if has a hash, i.e C#,D#				
			toConvert=(allchars[i+1]=="#")? allchars[i]+allchars[i+1] : allchars[i] ;			
		}else{
			toConvert=allchars[i];
		}

		note=this.letterToScaleNote(toConvert,mods);//send the same mods
		if(note!=null){
			notes_detected.push(note);
		}
	}
	return notes_detected
};

controlify.letterToScaleNote=function(letter,mods){
	/*
	Get index of the letter in the alphabet and return a MIDI Note Value

	@param 	letter 		: string , letter
	@param mods
		@value 	octave 		: int , add or substract ocatves to current note		
		@value  type 		: string , type of value, normal scale or alphabet scale	
	
	@return indexedNote : int , index of note in alphabet , null if not a letter
	
	letter_to_scaleNote("a") -> 0 which is note C0 in the default MIDI scale
	letter_to_scaleNote("a",{octave:1,type:'alphabet'}) -> 12 which is note C1 in the default MIDI scale
	*/

	var octave,type,velocity;
	mods=(mods===undefined)?{}:mods;
	octave=mods.octave;
	type=mods.type;
	velocity=mods.velocity;
	if(typeof letter==="string"){
		
		var indexednote;
		var octaveAdd=(typeof(octave)==='undefined' || typeof(octave)!=="number") ?0:octave*12;
		
		if(type==="scale"){
			letter=letter.toUpperCase();
			indexednote=defaults.notes.scale[letter]
			indexednote=(typeof indexednote!=='undefined')?indexednote+octaveAdd:null;
		}else{
			var letters="abcdefghijklmnopqrstuvwxyz".split("");
			indexednote=letters.indexOf(letter);
			indexednote=(indexednote!==-1)?indexednote+octaveAdd:null;
		}
		
		velocity=(typeof velocity ==='number')?velocity:controlify.createVelocity(letter,{method:'charCode'});
		
		//note number and velocity00
		return indexednote===null?null:[indexednote,velocity];
	
	}else{
		errorWarning('type','alphabet_to_scaleNote',letter,'string');
		return null;
	}
	
};

controlify.noteToLetter=function(note,mods){
	mods=(mods===undefined)?{}:mods;
	var octave;

	if(note>25){
		octave=1;
	}

	var letters="abcdefghijklmnopqrstuvwxyz".split("");
	
	for (var i = 0;i<5; i++) {
		letters=letters.concat(letters);
	};
	var indexedString=letters[note]
	return indexedString;
};

controlify.createChords=function (text,mods) {
	/*
	Create Chords from words in text

	@param text 			: string , text to be broken into words and create chords
	@param mods
		@value 	octave 		: int , add or substract ocatves to current note		
		@value  type 		: string , type of value, normal scale or alphabet scale
		@value velocity 	: string or number ,set velocity or method to create velocity
	@return chords_created 	: array  , list of al chords created
	*/

	var words=text.split(" ");
	var chords_created=[];

	for (var i = 0; i < words.length; i++) {
		word=words[i];
		notes=this.createNotes(word,mods);
		if(notes.length>0){
			chords_created.push(notes);
		}
	}
	return chords_created;

};

controlify.createVelocity=function(text,mods){
	/*
	creates value for controllers and notes
	@param text 	 : string , text to velocity
	@mods
		@value method: string , method to get velocity 
		@value max   : number , max value wanted
		@value val 	 : number , value to get from
		@value den	 : number , denominator	
	@return velocity : number , velocity created
	*/

	var method,a,b,c;
	if(mods){
		method=mods.method;
		a=mods.max;
		b=mods.val;
		c=mods.den;
	}

	a=(a===undefined) ? 1:a;
	c=(c===undefined) ? 1:c;
	var velocity;
	switch (method){
		case 'length':
			// i.e by length of text
			//128 *(text.length/ max text.length)
			//Not a fancy thing
			velocity=(a)*(b/c);
			break;
		case 'charCode':
			//by the character code
			//Continue here...
			velocity=text.charCodeAt();
			break;

		default:
			velocity=64;
			break;
	}
	return velocity
};


controlify.autoControl=function(cc,mods){
	/*Emulates automation
	@param cc 	: array , list of values to send
	@param mods
		@value max  : number , max value to be set or final value
		@value min  : number , min value or starting value
		@value tempo: number , values per minute to be sent
	*/
	var max,min,lengthMax,tempo;
	if(mods){
		max=mods.max;
		min=mods.min;
		tempo=mods.tempo;
	}	

	min=(typeof min===undefined)?0:min;
	max=(typeof max===undefined)?64:max;
	tempo=(typeof tempo===undefined)?120:tempo;
	
	var ms_tempo=controlify.createTempo(tempo);
	
	var timer=setInterval(function(){		
		if(min<max){
			min++;
			var values=cc;
			values[2]=min;
			sender.send('/osc_control','sii',values);
		}else{
			clearTimeout(timer);
		}
	},ms_tempo);

};

controlify.sendController=function(cc){
	/*
	Send Controllers
	@param cc : array , controller to send
	*/
	sender.send('/osc_control','sii',cc);
};

controlify.sendNote=function(cc,duration){
	/*
	Send Notes
	@param note : array , note to send
	*/
	duration=duration===undefined?0.5:duration;
	// console.log(duration)
	if(duration>0){
		sender.send('/osc_note','sii',['note'].concat(cc));
		setTimeout(function(){
			cc[1]=0;
			sender.send('/osc_note','sii',['note'].concat(cc));
		},duration*1000);
	}

};

controlify.sendChords=function(chords,mods){
		var finalchord=chords.length;
		var i=0;
		var speed=(mods.tempo) ? controlify.createTempo(mods.tempo) : 100;
		var timer=setInterval(function(){
			if(i<finalchord){
				var chord=chords[i];
				for (j in chord){
					controlify.sendNote(chord[j],mods.duration);	
				}				
				i++;
			}else{
				clearTimeout(timer);
			}

		},speed);
};

controlify.sendNotes=function(notes,mods){
	/*
	Send all notes created
	@param notes : list , all notese to be sent
	*/
	mods=mods===undefined?{}:mods;
	var finalNote=notes.length;
	var i=0;
	var speed=(typeof mods.tempo!==undefined) ? controlify.createTempo(mods.tempo) : 100;

	//set the timer to send notes and destroy it when last note was sent
	var timer=setInterval(function(){
		if(i<finalNote){
			var note=notes[i];
			controlify.sendNote(note,mods.duration);	
			i++;
			console.log("Sending Note : ",note);
		}else{
			clearTimeout(timer);
		}
	},speed);
};

controlify.createTempo=function(tempo){	
	/* Calculate milliseconds interval for the bpm
	@param tempo 	 : float , bpm
	@return ms_tempo : float , milliseconds intervals in bpm
	*/

	//NOTE: check if sending bpm or speed or duration
	var ms_tempo=1000/(tempo/60);
	return ms_tempo
}

controlify.createText=function(notes,mods){
	/* Create text from note values
	*/
	var text=[];
	for (i in notes){
		// var note=notes[i][0];
		var note=notes[0];		
		var string=controlify.noteToLetter(note); 
		text.push(string);

	}

	return text.join("");
}

function errorWarning(kind,where,parameter,paramType){
	/*create error msg*/
	var errors={
		type:("wrong type of parameter at: "+where+" "+parameter+" must be a "+paramType)
	}
	console.warn(errors[kind]);
};

module.exports=controlify;