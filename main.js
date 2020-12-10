//--------------------------------- Variables
var LOG_TIMEOUT = null;
var BASE_URL    = null;
var EXEC_LIST_CACHE = {};

//--------------------------------- Functions
function $_(selector)
{
    return document.querySelector(selector);
}

function $__(selector)
{
    return document.querySelectorAll(selector);
}

function isEmpty(obj) 
{ 
    for (var x in obj) { return false; }
    return true;
}

function get_current_url(callback)
{
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        callback(tabs[0].url);
    });
}

function get_base_url(url_str)
{
    var pathArray = url_str.split( '/' );
    var protocol  = pathArray[0];
    var host      = pathArray[2];
    var url       = protocol + '//' + host;

    return url;
}

function add_new_exec(exec_obj, callback=function(){}, fail_callback=function(){})
{
    chrome.storage.sync.get(["exec_list"], function(obj){
        var exec_list = obj.exec_list;
        
        if(typeof exec_list[exec_obj.base_url] === "undefined")
            exec_list[exec_obj.base_url] = [];

        var new_exec_obj = {
            selector  : exec_obj.selector,
            event     : exec_obj.event,
            func_body : exec_obj.func_body
        };

        exec_list[exec_obj.base_url].push(new_exec_obj);

        try
        {
            chrome.storage.sync.set({"exec_list" : exec_list}, callback);
            EXEC_LIST_CACHE[exec_obj.base_url].push(new_exec_obj);
        }
        catch(err)
        {
            fail_callback();
        }
    });
}

function get_exec_list(callback)
{
    chrome.storage.sync.get(["exec_list"], callback);
}

function show_exec_list()
{
	get_exec_list(function(list){ console.log(list["exec_list"]); });
}

function delete_exec(base_url, selector, event=null)
{
    get_exec_list(function(obj){
        var exec_list = obj.exec_list;

        if(typeof exec_list[base_url] === "undefined") return;
        
        for(var i=0; i < exec_list[base_url].length; i++)
        {
            var exec = exec_list[base_url][i];
            
            if(exec.selector != selector)
            {
                continue;
            }
            else
            {
                if(event != null)
                {
                    if(exec.event != event) continue;
                }
            }

            exec_list[base_url].splice(i, 1);
            EXEC_LIST_CACHE = EXEC_LIST_CACHE[base_url].splice(i, 1);
            
            if(isEmpty(exec_list[base_url]))
            {
                delete exec_list[base_url];
                break;
            }
        }

        chrome.storage.sync.set({exec_list : exec_list});
    });
}

function wipe_exec(base_url)
{
	get_exec_list(function(obj){
        var exec_list = obj.exec_list;

        if(typeof exec_list[base_url] === "undefined") return;
        
        delete exec_list[base_url];

        chrome.storage.sync.set({exec_list : exec_list});
    });
}

function print_log(text, color=null, hide=0)
{
    if(LOG_TIMEOUT != null)
    {
        clearTimeout(LOG_TIMEOUT);
        LOG_TIMEOUT = null;
    }

    if(color === null) color = "red";

    $_("#log").style.display = "block";
    $_("#log").style.color   = color;
    $_("#log").innerHTML     = text;

    if(hide > 0)
    {
        LOG_TIMEOUT = setTimeout(function(){
            $_("#log").style.display = "none";
        }, hide);
    }
}

function save_exec_event()
{
    var selector  = $_("#css-selector").value;
    var event     = $_("#element-event").value;
    var func_body = $_("#func-body").value;

    if(selector == "")
    {
        print_log("Selector cannot be empty.", null, 2000);
        return;
    }
    else if(event == "")
    {
        print_log("Event cannot be empty.", null, 2000);
        return;
    }

    get_current_url(function(url){
        var base_url = get_base_url(url);

        add_new_exec({
            base_url  : base_url,
            selector  : selector,
            event     : event,
            func_body : func_body
        }, function(){
            
            $_("#css-selector").value = "";
            $_("#element-event").value = "";
            $_("#func-body").value = "";

            var current_exec_count = $_("#exec-count").innerHTML;

            if(current_exec_count != "-")
                $_("#exec-count").innerHTML = parseInt(current_exec_count) + 1;

            print_log("New exec successfully added.", "#000", 2000);
            return;
        }, function(){
            print_log("An error occured while adding new exec.");
            return;
        });
    });
}

function delete_exec_event()
{
    var selector  = $_("#css-selector").value;
    var event     = $_("#element-event").value;
    var wipeout   = false;

    if(selector == "" && event == "")
    {
        var _ = confirm("Are you want to delete all execs on this site?");
        if(!_) return;
        wipeout = true;
    }

    get_current_url(function(url){
        var base_url = get_base_url(url);

        if(wipeout)
        {
            wipe_exec(base_url);

            $_("#exec-count").innerHTML = "0";

            print_log("All execs are successfully deleted.", null, 2000);
            return;
        }

        get_exec_list(function(list){
            var exec_list = list["exec_list"];
            
            if(typeof exec_list[base_url] != "undefined")
            {
                var delete_count = 0;

                for(var i=0; i < exec_list[base_url].length; i++)
                {
                    var exec = exec_list[base_url][i];

                    if((selector != "" 
                        && event != ""
                        && exec.selector == selector
                        && exec.event == event)
                    || selector == exec.selector
                    || event == exec.event)
                    {
                        delete_exec(base_url, exec.selector, exec.event);
                        delete_count++;
                    }
                }

                if(delete_count > 0)
                {
                    var current_exec_count = $_("#exec-count").innerHTML;

                    if(current_exec_count != "-"
                    && current_exec_count != "0")
                        $_("#exec-count").innerHTML = parseInt(current_exec_count) - delete_count;
                }

                print_log(delete_count+" exec(s) are successfully deleted.", null, 2000);
                return;
            }
            else
            {
                print_log("No exec found for this site.", null, 2000);
                return;
            }
        });
    });
}

function alert_exec_list_event()
{
    if(typeof EXEC_LIST_CACHE[BASE_URL] == "undefined")
    {
        alert("No exec found for this site.");
        return;
    }

    var alert_str     = "-==[EXEC LIST]==-\n";
    var exec_list_len = EXEC_LIST_CACHE[BASE_URL].length;
    
    for(var i=0; i < exec_list_len; i++)
    {
        var exec = EXEC_LIST_CACHE[BASE_URL][i];

        alert_str += "EXEC "+(i+1);
        alert_str += "\n";
        alert_str += "Selector: "+exec.selector;
        alert_str += "\n";
        alert_str += "Event: "+exec.event;
        alert_str += "\n";
        
        if(i != exec_list_len - 1)
        {
            alert_str += "----------";
            alert_str += "\n\n";
        }
    }

    alert(alert_str);
}

//--------------------------------- Main
// chrome.storage.sync.clear();

get_exec_list(function(obj){
    if(isEmpty(obj)) 
    {
        chrome.storage.sync.set({"exec_list" : {}});
        EXEC_LIST_CACHE = {};
    }
    else EXEC_LIST_CACHE = obj.exec_list;

    get_current_url(function(url){
        var base_url = get_base_url(url);
        BASE_URL = base_url;

        if(typeof obj.exec_list[base_url] != "undefined") 
			$_("#exec-count").innerHTML = obj.exec_list[base_url].length;
        else 
			$_("#exec-count").innerHTML = "0";
    });
});

$_("button#save").addEventListener("click", save_exec_event);
$_("button#delete").addEventListener("click", delete_exec_event);
$_("#exec-list").addEventListener("click", alert_exec_list_event);
