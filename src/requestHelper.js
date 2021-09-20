const LOCAL_STORAGE_KEY = "prognozToken";
const URL = "https://prognoz48.admlr.lipetsk.ru/PP_App_v8.0/app/PPService.axd";

function authorize() {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", URL, false);
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
    if (xhr.status === 200) {
        const response = JSON.parse(xhr.response);
        if (response.OpenMetabaseResult && response.OpenMetabaseResult.id) {
            return response.OpenMetabaseResult.id;
        } else {
            console.log("Error. Response:");
            console.table(response);
        }
    } else {
        console.log("Status " + xhr.status);
    }
}

function requestData(token) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", URL, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(
        {
            OpenDim: {
                tObject: {
                    id: token + "!4238578"
                },
                tArg: {
                    openArgs: "",
                    metaArg: {
                        pattern: {
                            obInst: "false",
                            getDescr: "true",
                            getAttrs: "true"
                        },
                        elsArg: {
                            pattern: {
                                attributes: "*",
                                getParentKey: "true"
                            }
                        }
                    }
                }
            }
        }
    ));
    if (xhr.status === 200) {
        const response = JSON.parse(xhr.response);
        if (response.OpenDimResult) {
            return response;
        } else {
            console.log("Error. Response:");
            console.log(response);
        }
    } else {
        console.log("Status " + xhr.status);
    }
}

function getData() {
    let token = localStorage.getItem(LOCAL_STORAGE_KEY);
    console.log("Stored token: " + token);
    let data = null;
    if (token) {
        data = requestData(token);
    }
    console.log("Requested data:");
    console.log(data);
    if (!data) {
        token = authorize();
        console.log("Requested token: " + token);
        localStorage.setItem(LOCAL_STORAGE_KEY, token);
        data = requestData(token);
        console.log("Requested data:");
        console.log(data);
    }
    return data;
}

export {getData};

