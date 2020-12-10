function get_current_base_url()
{
    return window.location.protocol+"//"+window.location.host;
}

chrome.storage.sync.get("exec_list", function(obj){
    var exec_list = obj.exec_list;

    for(var base_url in exec_list)
    {
        if(base_url != get_current_base_url()) continue;

        var url_exec_list = exec_list[base_url];

        for(var i=0; i < url_exec_list.length; i++)
        {
            var exec = url_exec_list[i];

            try
            {
                document.querySelector(exec.selector).addEventListener(exec.event, function(event){
                    eval(exec.func_body);
                });
        
                console.log('%c[EB JS Code Exec.]%c Injected the event. %c(Selector: "'+exec.selector+'", Event: "'+exec.event+'")', 'background: #222; color: #bada55', 'color:lime;', 'background: transparent; color:cyan;');
            }
            catch(error)
            {
                console.log('%c[EB JS Code Exec.]%c Failed to inject the event. %c(Selector: "'+exec.selector+'", Event: "'+exec.event+'", Error: "'+error+'")', 'background: #222; color: #bada55', 'color:red;', 'background: transparent; color:cyan;');
            }
        }
    }
});

//=============================================================================
// End of file
//=============================================================================
