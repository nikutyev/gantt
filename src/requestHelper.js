function authorize() {
    const xhr = new XMLHttpRequest();
    const url = "https://putsreq.com/81dvL1vyflbJIqJ2L0J9";
    xhr.open("POST", url, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(
        {
            OpenMetabase: {
                tDef: {
                    id: "BRIAS_WEB_7",
                    locale: 1049
                },
                tCreds: {
                    user: {
                        id: "BRIAS_WEB_7"
                    },
                    pass: "BRIAS_WEB"
                }
            }
        }
    ));
    if (xhr.status === 200){
        const response = JSON.parse(xhr.body);
        if (response.OpenMetabaseResult && response.OpenMetabaseResult.id){
            return response.OpenMetabaseResult.id;
        } else {
            console.log("error");
            console.table(response);
        }
    } else {
        console.log("status " + xhr.status)
    }
}

function requestData() {
    const token = authorize();
    console.log(token)
}

export {authorize, requestData};

