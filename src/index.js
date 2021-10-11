import JSGantt from "jsgantt-improved";
import MicroModal from "micromodal";
import { jsPDF } from "jspdf";
import html2canvas from "./html2canvas";

import { ru } from "./lang.js";
import { getData, LOCAL_STORAGE_KEY } from "./requestHelper";

import "./jsgantt.css";
import "./main.css";
import "./micromodal.css";

const parentElementsText = document.querySelector("#parent_elements");
const acceptedSelect = document.querySelector("#accepted_select");
const expandSelect = document.querySelector("#expand_select");
const hideOldSelect = document.querySelector("#hide_old_select");
const showAdditionalInfoSelect = document.querySelector("#show_additional_info_select");
const showPredictedDateSelect = document.querySelector("#show_predicted_date_select");
const objectsSelect = document.querySelector("#objects_select");
const showBaseVersionSelect = document.querySelector("#show_base_version_select");

// TODO remove require
const data = require("./response.json");
// const data = getData();

const array = data.OpenDimResult.meta.els.els.e;

const displaySettings = {
  acceptedStatus: null,
  hideOldTasks: false,
  expandAll: false,
  showAdditionalInfo: false,
  showPredictedDate: false,
  object: null,
  showBaseVersion: false,
};

const pItems = [];
for (let i = 0; i < array.length; i++) {
  if (parseInt(array[i].a.it[7]) === 0 && array[i].n !== "ИТОГО")
    pItems.push(array[i]);
}

function getItemIndex(key) {
  for (let i = 0; i < array.length; i++)
    if (parseInt(array[i].k) === parseInt(key)) return i;
}

let lastParentKey = null;
function redraw(parentKey = lastParentKey, settings = displaySettings) {
  lastParentKey = parentKey;

  const g = new JSGantt.GanttChart(
    document.getElementById("GanttChartDIV"),
    "month"
  );

  g.addLang("ru1", ru);

  g.setOptions({
    vCaptionType: "Complete",
    vQuarterColWidth: 36,
    vDateTaskDisplayFormat: "dd.mm.yyyy",
    vDayMajorDateDisplayFormat: "mon.yyyy - Week ww",
    vWeekMinorDateDisplayFormat: "dd.mon",
    vLang: "ru1",
    vShowTaskInfoLink: 0,
    vShowEndWeekDate: 0,
    vUseSingleCell: 10000,
    vFormatArr: ["Day", "Week", "Month", "Quarter"],
    vScrollTo: "today",
  });
  g.setDateTaskTableDisplayFormat("dd.mm.yyyy");
  g.setShowRes(0);
  g.setShowTaskInfoRes(0);
  g.setShowTaskInfoNotes(settings.showAdditionalInfo ? 1 : 0);
  g.setShowComp(0);
  g.setShowTaskInfoComp(0);
  g.setShowPlanStartDate(0);
  g.setShowPlanEndDate(settings.showPredictedDate ? 1 : 0);
  g.setShowStartDate(1);
  g.setShowEndDate(1);
  g.setShowDur(1);

  let index = getItemIndex(parentKey) + 1;
  let items = [];
  while (true) {
    const item = array[index];
    const level = parseInt(item.a.it[7]);
    if (!level || level === 0) break;
    items.push(item);
    index++;
  }

  buildObjectsSelect(items, settings.object);

  const today = new Date();
  items = items.filter(
    (item) =>
      (!settings.acceptedStatus || item.a.it[8] == settings.acceptedStatus) &&
      (!settings.hideOldTasks ||
        (new Date(item.a.it[4]) > today && item.a.it[8] == 1))
  );

  // по объекту фильтрация отдельно
  let children = false;
  if (settings.object) {
    let newItems = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].k === settings.object) children = true;
      else if (items[i].o === 2) children = false;
      if (children) newItems.push(items[i]);
    }
    items = newItems;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const next = items[i + 1];
    const level = parseInt(item.a.it[7]);
    // const accepted = item.a.it[8];

    let notes = "";
    if (settings.showAdditionalInfo) {
      notes =
        "Заказчик: " +
        item.a.it[11] +
        "<br>" +
        "Подрядчик: " +
        item.a.it[12] +
        "<br>" +
        "Комментарий: " +
        item.a.it[13];
    }

    g.AddTaskItemObject({
      pID: parseInt(item.k),
      pName: item.n,
      // pStart: settings.showBaseVersion ? item.a.it[15] : item.a.it[3],
      pStart: item.a.it[3],
      // pEnd: settings.showBaseVersion ? item.a.it[16] : item.a.it[4],
      pEnd: item.a.it[4],
      // pPlanStart: settings.showPredictedDate ? item.a.it[3] : "",
      pPlanStart:  settings.showBaseVersion ? item.a.it[15] : "",
      // pPlanEnd: settings.showPredictedDate ? item.a.it[14] : "",
      pPlanEnd: settings.showBaseVersion ? item.a.it[16] : "",
      // pClass: settings.showBaseVersion ? "gtaskgrey" : "gtaskblue",
      pClass: "gtaskblue",
      pLink: "",
      pMile: 0,
      pRes: item.a.it[5],
      pComp: 0,
      pGroup: next && next.p === item.k ? 1 : 0,
      pParent:
        level > 1 && item.p !== undefined && item.p.length > 0
          ? parseInt(item.p)
          : 0,
      pOpen: settings.expandAll ? 1 : 0,
      pDepend: item.a.it[10] ? item.a.it[10].split(" ") : "",
      pCaption: "",
      pNotes: notes,
    });
  }
  g.Draw();
}

function setParentElementsText(key) {
  let item = array[getItemIndex(key)];
  let text = item.n;
  while (item.p && item.p.length > 0) {
    item = array[getItemIndex(item.p)];
    text = "<span>" + item.n + "</span>" + "<span>" + text + "</span>";
  }
  parentElementsText.innerHTML = text;
}

function setFirstItemSelected() {
  for (let i = 0; i < array.length; i++) {
    if (
      parseInt(array[i].a.it[7]) === 0 &&
      parseInt(array[i + 1].a.it[7]) === 1
    ) {
      redraw(parseInt(array[i].k));
      setParentElementsText(parseInt(array[i].k));
      break;
    }
  }
}

function buildModalList() {
  const listEl = document.querySelector("#modal_list");
  let ul;
  for (let i = 0; i < pItems.length; i++) {
    const item = pItems[i];
    const next = pItems[i + 1];
    const li = document.createElement("li");
    li.innerHTML = item.n;
    if (!next || item.k !== next.p) {
      li.addEventListener("click", () => {
        MicroModal.close("modal-1");
        setParentElementsText(parseInt(item.k));
        redraw(parseInt(item.k));
      });
      li.classList.add("clickable");
      li.classList.add("list-child");
      ul.appendChild(li);
    } else {
      li.classList.add("modal_list-title");
      li.addEventListener("click", function () {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
          panel.style.maxHeight = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
      listEl.append(li);
      ul = document.createElement("ul");
      ul.classList.add("modal_sublist");
      listEl.appendChild(ul);
    }
  }
}

function buildObjectsSelect(items, selected) {
  objectsSelect.innerHTML = "";
  const option = document.createElement("option");
  option.selected = !selected;
  option.innerHTML = "Все";
  option.value = "";
  objectsSelect.appendChild(option);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const next = items[i + 1];
    if (next && item.k === next.p && item.o == 2) {
      const option = document.createElement("option");
      option.selected = item.k === selected;
      option.innerHTML = item.n;
      option.value = item.k;
      objectsSelect.appendChild(option);
    }
  }
}

parentElementsText.addEventListener("click", () => {
  MicroModal.show("modal-1");
});
acceptedSelect.addEventListener("change", (e) => {
  displaySettings.acceptedStatus = e.target.value;
  redraw();
});
expandSelect.addEventListener("change", (e) => {
  displaySettings.expandAll = e.target.value;
  redraw();
});
hideOldSelect.addEventListener("change", (e) => {
  displaySettings.hideOldTasks = e.target.value;
  redraw();
});
showAdditionalInfoSelect.addEventListener("change", (e) => {
  displaySettings.showAdditionalInfo = e.target.value;
  redraw();
});
showPredictedDateSelect.addEventListener("change", (e) => {
  displaySettings.showPredictedDate = e.target.value;
  redraw();
});
objectsSelect.addEventListener("change", (e) => {
  displaySettings.object = e.target.value;
  redraw();
});
showBaseVersionSelect.addEventListener("change", (e) => {
  displaySettings.showBaseVersion = e.target.value;
  redraw();
});

buildModalList();
setFirstItemSelected();

function updateSession() {
  localStorage.setItem(LOCAL_STORAGE_KEY, "");
  document.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  const updateSessionBtnEl = document.getElementById("updateSession");

  updateSessionBtnEl.addEventListener("click", (e) => {
    updateSession();
  });
});

// сбрасывает сессию в прогнозе, обновляя связи
document.addEventListener("keypress", (e) => {
  if (e.key.toLowerCase() === "r" || e.key.toLowerCase() === "к") {
    updateSession();
  }
});

const saveToPdf = document.getElementById("saveToPdf");

saveToPdf.addEventListener("click", () => {
  const wrapper = document.querySelector(".wrapper");

  html2canvas(wrapper).then(function (canvas) {
    // a4 альбомный формат [841.89, 595.28]
    const A4_HEIGHT = 592.28;
    const A4_WIDTH = 841.89;
    const contentWidth = canvas.width;
    const contentHeight = canvas.height;

    // высота канваса, которая помещается на одну страницу pdf
    let pageHeight = (contentWidth / A4_WIDTH) * A4_HEIGHT;
    // высота канваса, которая не помещается
    let leftHeight = contentHeight;
    // сдвиг по оси y
    let position = 0;

    var imgWidth = A4_WIDTH;
    var imgHeight = (A4_WIDTH / contentWidth) * contentHeight;

    var pageData = canvas.toDataURL("image/jpeg", 1.0);

    const pdf = new jsPDF({
      unit: "pt",
      orientation: "landscape",
      format: "a4",
    });

    if (leftHeight < pageHeight) {
      pdf.addImage(pageData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      while (leftHeight > 0) {
        pdf.addImage(pageData, "JPEG", 0, position, imgWidth, imgHeight);
        leftHeight -= pageHeight;
        position -= A4_HEIGHT;
        //убираем пустую страницу
        if (leftHeight > 0) {
          pdf.addPage();
        }
      }
    }

    pdf.save("Отчёт.pdf");
  });
});
