const LOCAL_STORAGE_KEY = "prognozToken";
const URL = "https://prognoz48.admlr.lipetsk.ru/PP_App_v8.0/app/PPService.axd";
const REQUESTED_DATA = {
  TABLE: "TABLE",
  SETTINGS: "SETTINGS"
};

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

function requestSettings(token) {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", URL, false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(
    {
      GetCube: {
        tCube: {
          id: token + "!4257016"
        },
        tArg: {
          data: {
            cells: true,
            emptyCells: false,
            selection: {
              it: [
                {
                  k: 4257010,
                  id: "DIM_GANT_CONFIG",
                  sel: {
                    elSelectOp: "Select",
                    elRelative: "All"
                  }
                },
                {
                  k: 4257022,
                  id: "FACTS",
                  sel: {
                    elSelectOp: "Select",
                    elRelative: "All"
                  }
                }
              ]
            },
            dims: {
              its: {
                it: [
                  {
                    k: 4257010,
                    id: "DIM_GANT_CONFIG",
                    position: "Top"
                  },
                  {
                    k: 4257022,
                    id: "FACTS",
                    position: "Left"
                  }
                ]
              }
            }
          }
        }
      }
    }
  ));
  if (xhr.status === 200) {
    const response = JSON.parse(xhr.response);
    if (response.GetCubeResult) {
      return response;
    } else {
      console.log("Error. Response:");
      console.log(response);
    }
  } else {
    console.log("Status " + xhr.status);
  }
}

function doRequest(requestedData) {
  let requestFunction;
  switch (requestedData) {
    case REQUESTED_DATA.TABLE:
      requestFunction = requestData;
      break;
    case REQUESTED_DATA.SETTINGS:
      requestFunction = requestSettings;
      break;
  }

  let token = localStorage.getItem(LOCAL_STORAGE_KEY);
  let result = null;
  if (token) {
    result = requestFunction(token);
  }
  if (!result) {
    token = authorize();
    localStorage.setItem(LOCAL_STORAGE_KEY, token);
    result = requestFunction(token);
  }
  return result;
}

function getData() {
  return doRequest(REQUESTED_DATA.TABLE);
}

function getSettings() {
  const settingsRaw = doRequest(REQUESTED_DATA.SETTINGS);
  return {
    daysTillExpiration: parseInt(settingsRaw.GetCubeResult.data.cells.c[0]["@v"]),
  }
}

export {getSettings, getData, LOCAL_STORAGE_KEY};

