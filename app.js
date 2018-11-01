const {Client} = require("discord.js"), bot = new Client(), auth = require("./auth.json");
const puppeteer = require('puppeteer'), utils = require('./utils.js'), fs = require('fs');

// WEBSITE PAGES
const mainPageURL = "https://www.wow-freakz.com/index.php";
const forumsFixedPageURL = "https://www.freakz.ro/forum/Fixed-Closed-bugs-f5556.html";
const itemFinderPageURL = "https://www.wow-freakz.com/item_finder.php?item=";
const armoryPageURL = "https://armory.wow-freakz.com/character/felsong/";

// Variables
var pictureIndex = 0;
var browsers = [];

// Browser Class
class Browser {
	constructor(ID){
		this.ID = ID;
		this.startbrowser();
	}
	// Public Functions to Scrap websites
	async startbrowser(){
		this.browser = await puppeteer.launch();
	}
	async scrapNews(channel) { // Newpage() and GoTo(mainPage) and channel.send(news);
		// Prepare
		var message = await channel.send("Working on getting the latest news...");
		var page = await this.browser.newPage();
		await page.setViewport({width: 1280, height: 720})
		await page.goto(mainPageURL,{waitUntil: 'domcontentloaded'});

		// Scrap
		var result = await page.evaluate(() => {
			let news = document.querySelectorAll('.box_content_middle_real')[1].innerText;
			return{news}
		});
		// POST Result
		channel.stopTyping();
		message.edit(result.news);
		page.close();
	}
	async scrapFixes(channel) { // Newpage() and GoTo(forumsFixedPage) and channel.send(fixes);
		// Prepare
		var message = await channel.send("Working on getting the latest fixes...");
		var page = await this.browser.newPage();
		await page.setViewport({width: 1280, height: 720})
		await page.goto(forumsFixedPageURL,{waitUntil: 'domcontentloaded'});

		// Scrap
		var result = await page.evaluate(() => {
			var fixes = "Last 10 Fixes:";
			var rowElements = document.querySelectorAll('div > .topictitle > a');
			var j = 0;
			for(var i = 0; j<10 ;i++){
				if(rowElements[i].innerText && rowElements[i].querySelector('font')){
					if(rowElements[i].querySelector('font').getAttribute("color") == "green"){
						var info = rowElements[i].innerText.split("[fixed] ")[1];
						fixes += "\n>> " + info;
						j++;
					}
				}
			}
			return{fixes}
		});
		// POST Result
		channel.stopTyping();
		message.edit(result.fixes);
		page.close();
	}
	async scrapItem(channel,item){ // Newpage() and GoTo(itemFinderPage) and channel.send(itemInfo);
		// Prepare
		var message = await channel.send("Working on getting info about the item(s): "+item);
		var itemPageURL = itemFinderPageURL + (item.replace(/ /g, "+"));
		var page = await this.browser.newPage();
		await page.setViewport({width: 1280, height: 720})
		await page.goto(itemPageURL,{waitUntil: 'domcontentloaded'});

		// Scrap
		var result = await page.evaluate(() => {
			if(document.querySelector('.error_msg') != null){
				var error = "Item Not Found";
				return {error};
			}
			if(document.querySelector('.item-specs') == null){
				var Elements = document.querySelectorAll('.itemLargeName > .itemLargeLink');
				var j = 0;
				let fields = [];
				for(var i = 0; j<Math.min(5, Elements.length);i++){
					if(Elements[i].innerText){
						// Get & Assign info
						fields[i] = {
		                    name: "Item Name: "+Elements[i].innerText,
		                    value: "ID: " + Elements[i].getAttribute("href").split("/item_finder.php?item=")[1].split("&")[0],
		                    inline: false
		                };
						j++;
					}		
				}
				return{fields}
			}else{
				let name = document.querySelector('.itemFinderTooltip > h3').innerText;
				let img = getComputedStyle(document.querySelector('.itemFinderIcon')).getPropertyValue("Background-Image")
																					 .split("url(\"")[1].split("\")")[0];
				let color = document.querySelector('.itemFinderTooltip > h3').getAttribute('class');
				let specs = "";

				var elements = document.querySelectorAll('.itemFinderTooltip > .item-specs > li');
				for (var i = 0; i<elements.length ;i++){
					if(elements[i].innerText){
						specs += "\n" + elements[i].innerText;
					}
				}

				return{name, img, color, specs}
			}
		});		
		// Post result	
		if(result.error){
			channel.stopTyping();
			message.edit("Here you go:",{
				embed: {
	            	color: 0xFFFFFF,
	            	title: "Results For: " + "\""+item+"\"",
	            	description: result.error
	            }
            });
			page.close();
			return;
		}
		if(result.name){
			channel.stopTyping();
			message.edit("Here you go:",{
				embed: {
		        	thumbnail: {
		        		url: result.img,
		        		height: 51,
		        		width: 51},
		            color: utils.pickColor(result.color),
		            author : {
		            	name: result.name,
		            	url: itemPageURL
		            },		            
		            description: result.specs
		        }
		  	});
		}else{
			channel.stopTyping();
			message.edit("Here you go:",{
				embed: {
		            color: 0xFFFFFF,
		            title: "Results For: " + "\""+item+"\"",
		            fields: result.fields
		        }
		  	});
	  	}
		page.close();
	}
	async scrapArmory(channel,player){ // Newpage() and GoTo(armoryPage) and channel.send(playerInfo);
		// Prepare
		var message = await channel.send("Working on " + player + ". Please wait a moment.");
		var index = pictureIndex;
		pictureIndex++;
		var armoryURL = armoryPageURL + player;
		var page = await this.browser.newPage();
		await page.setViewport({width: 1280, height: 720})
		await page.goto(armoryURL,{waitUntil: 'networkidle2'});

		// Scrap
		var result = await page.evaluate(() => {
			if(document.querySelector('#server-error') != null){
				var error = "Player Not Found";
				return {error};
			}
			if(document.querySelector('.item-specs') == null){
				let x = document.querySelector('.summary-top').getBoundingClientRect().left-230;
				let y = document.querySelector('.summary-top').getBoundingClientRect().top;
				let width = document.querySelector('.summary-top').getBoundingClientRect().width+232;
				let height = document.querySelector('.summary-top').getBoundingClientRect().height;
				return{x,y,width,height}
			}
		});
		// Post result
		if(result.error){
			channel.stopTyping();
			message.edit("Here you go:",{
				embed: {
	            	color: 0xFFFFFF,
	            	title: "Results For: " + "\""+player+"\"",
	            	description: result.error
	            }
            });
            page.close();
			return;
		}
		if(result.x){
			await page.screenshot({
		    	path: "Armory/"+index+".png",
		    	clip: {x: result.x, y: result.y, width:result.width, height:result.height}
		    });	
			await channel.send({
	    		file: "Armory/"+index+".png"
		  	});
		  	message.edit("Done Working on " + player + ". Check result.");
		  	channel.stopTyping();
		  	await fs.unlink("Armory/"+index+".png", (err) => {
				if (err) throw err;
				console.log("Armory/"+index+".png was deleted");
			});
		}
		page.close();		
	}
	async scrapStats(channel) { // Newpage() and GoTo(mainPage) and channel.send(stats);
		// Prepare
		var message = await channel.send("Working on live server statistics...");
		var page = await this.browser.newPage();
		await page.goto(mainPageURL,{waitUntil: 'domcontentloaded'});

		// Scrap
		var result = await page.evaluate(() => {
			let uptime = "";
			if(document.querySelector('#uptime_5').innerText.includes("Offline")) uptime = "Offline";
			else uptime = document.querySelector('#uptime_5').innerText.split("Uptime: ")[1]+" Since Last Restart.";
			let players = document.querySelectorAll('.realm_div_5 > font')[1].innerText;
			let record = document.querySelectorAll('.realm_div_5 > font')[2].innerText;
			return{uptime, players, record}
		});
		// POST Result
		channel.stopTyping();
		message.edit("Here you go:",{
				embed: {
	            color: 3447003,
	            title: "FELSONG (Legion 7.2.5)",
	            fields: [
	                {	
	                	name: "Players",
	                	value: result.players + " Currently Online " + result.record
	                },
	            	{	
	            		name: "Uptime",
	                	value: result.uptime
	                },
	            	{	
	            		name: "More Info:",
	                	value: "Check https://www.wow-freakz.com/server_info.php For More Info About Our Server."
	                }
	            ]
	        }
	  	  });
		page.close();
	}
}

// Bot gets ready and creates browsers
bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}(${bot.user.id})`);
    bot.user.setActivity(`World of Warcraft`);
    // Make Browsers for all servers
    var servers = bot.guilds.array();
    for(var i = 0; i < servers.length ;i++){
    	browsers[servers[i].id] = new Browser(servers[i].id);
    }
});

// Bot gets invited and creates browser for new guild
bot.on("guildCreate", guild => {
	console.log(`Joined New Guild: ${guild.name} (ID: ${guild.id}).`);
	browsers[guild.id] = new Browser(guild.id);
});

// Bot gets removed and deletes browser
bot.on("guildDelete", guild => {
	console.log(`Removed From Guild: ${guild.name} (ID: ${guild.id})`);
	browsers[guild.id].browser.close();
	delete browsers[guild.id];
});

// Bot gets a message somewhere and checks for commands
bot.on('message', e => {
	if(e.author == bot.user){
		utils.cleanup(e,180000);
	}
    if(e.author != bot.user){
    	command = e.content.split(" ")[0];
    	// LOOK UP PLAYER IN ARMORY
    	if(command == '?armory'){
    		e.channel.startTyping();
    		var player = e.content.split(" ").slice(1).join(" ").replace(" ", "").replace(/[^\w]/gi, "");
    		browsers[e.guild.id].scrapArmory(e.channel,player);
    		utils.cleanup(e,180000);
    	}

    	// LOOK UP ITEM IN ITEM FINDER
    	if(command == '?item'){
    		e.channel.startTyping();
    		var item = e.content.split(" ").slice(1).join(" ").split("&")[0];
    		browsers[e.guild.id].scrapItem(e.channel,item);
    		utils.cleanup(e,180000);
    	}

    	// LOOK UP LATEST NEWS
    	else if(command == '?news'){
    		e.channel.startTyping();
    		browsers[e.guild.id].scrapNews(e.channel);
    		utils.cleanup(e,180000);
    	}

    	// LOOK UP LATEST FIXES
    	else if(command == '?fixes'){
    		e.channel.startTyping();
    		browsers[e.guild.id].scrapFixes(e.channel);
    		utils.cleanup(e,180000);
    	}

    	// GET STATS
    	else if(command == '?stats'){
    		e.channel.startTyping();
    		browsers[e.guild.id].scrapStats(e.channel);
    		utils.cleanup(e,180000);
    	}
    	else if(command == '?help'){
    		e.author.send("**Commands:**\n\n"
	    		+"**$item <itemID or itemName>:** to look up item info\n"
	    		+"**$armory <playerName>:** to get info about a player's armory\n"
	    		+"**$fixes:** to look up all recent fixes\n"
	    		+"**$news:** to look up the latest news from Freakz\n"
	    		+"**$stats:** to get stats about Freakz");
    		utils.cleanup(e,5000);
    	}
    }
});

// Bot logs in
bot.login(process.env.BOT_TOKEN); 