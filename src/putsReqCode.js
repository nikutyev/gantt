/*
* Этот код можно скопипастить для тестирования запросов в сервисе putsReq (https://putsreq.com).
* Для этого нужно создать там бакет, поместить туда этот код,
* а в requestHelper.js#URL поместить ссылку на бакет (e.g. "https://putsreq.com/81dvL1vyflbJIqJ2L0J9")
* */

const requestBody = JSON.parse(request.body);

const sessId = "2!M";

if (requestBody.OpenMetabase && requestBody.OpenMetabase.tCreds.user.id === "BRIAS_WEB_7") {
    response.body = JSON.stringify(
        {
            OpenMetabaseResult: {
                id: sessId,
                sessKey: 0,
                sessCookie: "0",
                version: "0"
            }
        }
    );
} else if (requestBody.OpenDim) {
    if (requestBody.OpenDim.tObject.id === sessId + "!4238578") {
        response.body = JSON.stringify(
            {
                OpenDimResult: {},
            }
        );
    } else {
        response.body = JSON.stringify(
            {
                Fault: {
                    faultcode: "soapenv:Sender",
                    faultstring: "Некорректный идентификатор сессии"
                }
            }
        );
    }
} else {
    response.status = 404;
}
