import JSGantt from "jsgantt-improved";
import MicroModal from "micromodal";
import {jsPDF} from "jspdf";
import html2canvas from "./html2canvas";
import autoComplete from "@tarekraafat/autocomplete.js";

import {ru} from "./lang.js";
import {getData, getSettings, LOCAL_STORAGE_TOKEN, LOCAL_STORAGE_YEAR} from "./requestHelper";

import "./jsgantt.css";
import "./main.css";
import "./micromodal.css";
import "./autocomplete.css";

const RED_TASK = "gtaskred";
const YELLOW_TASK = "gtaskyellow";
const BLUE_TASK = "gtaskblue";
const GREEN_TASK = "gtaskgreen";
const DEFAULT_DAYS_TO_YELLOW = 3;

function onClose(modal) {
  closeAccordion();
}

let dataObjects = [];
const yearSelect = document.querySelector("#year_select");
const parentElementsText = document.querySelector("#parent_elements");
const acceptedSelect = document.querySelector("#accepted_select");
const expandSelect = document.querySelector("#expand_select");
const hideOldSelect = document.querySelector("#hide_old_select");
const showAdditionalInfoSelect = document.querySelector("#show_additional_info_select");
const showPredictedDateSelect = document.querySelector("#show_predicted_date_select");
const objectsSelect = document.querySelector("#objects_select");
const showBaseVersionSelect = document.querySelector("#show_base_version_select");

function fillYearSelect(startYear, numberOfYears) {
  let savedYear = localStorage.getItem(LOCAL_STORAGE_YEAR);
  if (!savedYear) {
    savedYear = startYear;
    localStorage.setItem(LOCAL_STORAGE_YEAR, startYear);
  }
  for (let i = 0; i < numberOfYears; i++) {
    const option = document.createElement("option");
    option.selected = (startYear - i) === parseInt(savedYear);
    option.innerHTML = (startYear - i).toString();
    option.value = (startYear - i).toString();
    yearSelect.appendChild(option);
  }
}

fillYearSelect(new Date().getFullYear(), 4);

// TODO remove require
const data = require("./alt_response.json");
const requestedSettings = {};
// const requestedSettings = getSettings();
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

function getItemIndex(key, arr) {
  for (let i = 0; i < arr.length; i++)
    if (parseInt(arr[i].k) === parseInt(key)) return i;
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
    vQuarterColWidth: 50,
    vMonthColWidth: 50,
    vWeekColWidth: 40,
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

  let index = getItemIndex(parentKey, array) + 1;
  let items = [];
  while (true) {
    const item = array[index];
    const level = parseInt(item.a.it[7]);
    if (!level || level === 0) break;
    items.push(item);
    index++;
  }

  buildObjectsSelect(items, settings.object);
  dataObjects = buildData(items);

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

  // вычисление подкраски и сдвигов в зависимости от связей
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.a.it[10]) {
      const deps = item.a.it[10].split(" ");
      for (let j = 0; j < deps.length; j++) {
        const dependency = deps[j];
        const parentId = dependency.substring(0, dependency.length - 2);
        const type = dependency.substring(dependency.length - 2);
        if (type === "FS") {
          const parent = items[getItemIndex(parentId, items)];
          const parentPlanEndDate = new Date(parent.a.it[14]);
          const parentEndDate = new Date(parent.a.it[4]);
          if (parent.datesShift) {
            item.datesShift = parent.datesShift;
            parent.color = "gtaskgrey";
            item.color = "gtaskgrey";
          } else {
            const shift = parentPlanEndDate - parentEndDate;
            if (shift > 0){
              item.datesShift = shift;
              parent.color = "gtaskgrey";
              item.color = "gtaskgrey";
            }
          }
          // если дата окончания родителя больше чем дата начала дочернего элемента, то подкрашиваются оба
          // if (new Date(parent.a.it[4]) > new Date(item.a.it[3])) {
          //   parent.color = "gtaskgrey";
          //   item.color = "gtaskgrey";
          // }
        }
      }
    }
  }

  function stringifyDate(date) {
    let days = date.getDate();
    let months = date.getMonth() + 1;
    months = "" + months;
    if (months.length === 1)
      months = "0" + months;
    let years = date.getFullYear();
    return years + "-" + months + "-" + days;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const next = items[i + 1];
    const level = parseInt(item.a.it[7]);
    const dependencies = item.a.it[10] ? item.a.it[10].split(" ") : "";

    const endDate = new Date(item.a.it[4]);
    const planEndDate = new Date(item.a.it[14]);
    const accepted = parseInt(item.a.it[8]);

    let notes = "";
    if (settings.showAdditionalInfo.length > 0) {
      if (settings.showAdditionalInfo.includes("customer"))
        notes += "Заказчик: " + item.a.it[11] + "<br>";
      if (settings.showAdditionalInfo.includes("contractor"))
        notes +=  "Подрядчик: " + item.a.it[12] + "<br>";
      if (settings.showAdditionalInfo.includes("comment"))
        notes +=  "Комментарий: " + item.a.it[13];
    }

    let color = BLUE_TASK;

    if (endDate < today && accepted === 1)
      color = GREEN_TASK;

    if (item.a.it[14] && planEndDate > endDate || (accepted !== 1 && endDate < today))
      color = RED_TASK;

    // если дата окончания наступит меньше чем через n дней
    const days = requestedSettings.daysTillExpiration ? requestedSettings.daysTillExpiration : DEFAULT_DAYS_TO_YELLOW;
    if (endDate > today && endDate - today < 3600000 * 24 * days)
      color = YELLOW_TASK;

    if (item.color)
      color = item.color;

    let pStart = item.a.it[3];
    let pEnd =  item.a.it[4];

    let pPlanStart = item.a.it[3];
    let pPlanEnd =  item.a.it[14];

    if (item.datesShift) {
      const start = new Date(pPlanStart);
      const end = new Date(pPlanEnd);
      start.setTime(start.getTime() + item.datesShift);
      end.setTime(end.getTime() + item.datesShift);
      pPlanStart = stringifyDate(start);
      pPlanEnd = stringifyDate(end);
    }

    g.AddTaskItemObject({
      pID: parseInt(item.k),
      pName: item.n,
      pStart: pStart,
      pEnd: pEnd,
      pPlanStart: settings.showBaseVersion ? item.a.it[15] : (settings.showPredictedDate ? pPlanStart : ""),
      pPlanEnd: settings.showBaseVersion ? item.a.it[16] : (settings.showPredictedDate ? pPlanEnd : ""),
      pClass: color,
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
      pDepend: dependencies,
      pCaption: "",
      pNotes: notes,
    });
  }
  g.Draw();
}

function setParentElementsText(key) {
  let item = array[getItemIndex(key, array)];
  let text = item.n;
  while (item.p && item.p.length > 0) {
    item = array[getItemIndex(item.p, array)];
    text = "<span>" + item.n.toUpperCase() + "</span>" + "<span>" + text + "</span>";
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
      li.innerHTML = item.n.toUpperCase();
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

function buildData(items) {
  const data = [];
  for (let i = 0; i < pItems.length; i++) {
    const item = pItems[i];
    const next = pItems[i + 1];

    if (!next || item.k !== next.p) {
      data.push({ name: item.n, id: item.k });
    }
  }
  return data;
}

parentElementsText.addEventListener("click", () => {
  MicroModal.show("modal-1", {
    onClose: onClose,
  });
});
yearSelect.addEventListener("change", e => {
  localStorage.setItem(LOCAL_STORAGE_YEAR, e.target.value);
  window.location.reload();
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
  const vals = [];
  const selected = e.target.selectedOptions;
  for (let i = 0; i < selected.length; i++) {
    vals.push(selected[i].value);
  }
  displaySettings.showAdditionalInfo = vals;
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

function closeAccordion() {
  const activeTabs = document.querySelectorAll(".modal_list-title.active");

  activeTabs.forEach((item) => {
    item.click();
  });
}

function updateSession() {
  localStorage.setItem(LOCAL_STORAGE_TOKEN, "");
  document.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  const updateSessionBtnEl = document.getElementById("updateSession");

  updateSessionBtnEl.addEventListener("click", (e) => {
    updateSession();
  });
});

const saveToPdf = document.getElementById("saveToPdf");

const tableBodyLeft = document.querySelector(".gmainleft .gtasktablewrapper");
const tableBodyRight = document.querySelector(
  ".gmainright #GanttChartDIVgchartbody"
);
const gantt = document.querySelector("#GanttChartDIV");

saveToPdf.addEventListener("click", () => {
  const wrapper = document.querySelector(".wrapper");
  var headerCanvas = null;

  document.querySelectorAll(".gname.glineitem").forEach((item) => {
    if (item.getBoundingClientRect().top > 1106) {
      item.style.background = "#black";
      return false;
    }
  });

  const headerGanttConfig = {
    height: 80,
    x: 0,
    y: 0,
  };

  const wrapperConfig = {
    onclone: (el) => {
      const cloneDosumentWidth = 1920;
      const wrapperClone = el.querySelector(".wrapper");
      const ganttClone = wrapperClone.querySelector(".gantt");
      const leftSideGanttClone = ganttClone.querySelector(".gmainleft");
      const quarterBtn = ganttClone.querySelector(
        "#GanttChartDIVformatquartertop"
      );
      const taskName = ganttClone.querySelectorAll(
        ".gtasktable .gname .gtaskname div"
      );
      const footerLeft = ganttClone.querySelector(
        ".gmainleft .gtasktable tbody tr:last-child"
      );
      const footerRight = ganttClone.querySelector(
        ".gmainright .gcharttable tfoot .footerdays"
      );
      const gChartClone = gantt.querySelector(".gcharttable");
      const gRightCloneWidth = parseInt(gChartClone.style.width);
      const gLeftSideWidth = parseInt(leftSideGanttClone.style.width);

      const commonWidth = gRightCloneWidth + gLeftSideWidth;
      const marginLeft = (cloneDosumentWidth - commonWidth) / 2;

      //ganttClone.style.marginLeft = `${marginLeft}px`;

      wrapperClone.style.width = `${cloneDosumentWidth}px`;

      footerLeft.style.display = "none";
      footerRight.style.display = "none";
    },
  };

  tableBodyLeft.setAttribute("data-html2canvas-ignore", true);
  tableBodyRight.setAttribute("data-html2canvas-ignore", true);

  html2canvas(gantt, headerGanttConfig)
    .then((canvas) => {
      headerCanvas = canvas;
      tableBodyLeft.removeAttribute("data-html2canvas-ignore");
      tableBodyRight.removeAttribute("data-html2canvas-ignore");
    })
    .then(() => {
      html2canvas(wrapper, wrapperConfig).then((canvas) => {
        // a4 альбомный формат [841.89, 595.28]
        const A4_HEIGHT = 593;
        const A4_WIDTH = 842;
        const contentWidth = canvas.width;
        const contentHeight = canvas.height;

        // высота канваса, которая помещается на одну страницу pdf
        let pageHeight = (contentWidth / A4_WIDTH) * A4_HEIGHT;
        // высота канваса, которая не помещается
        let leftHeight = contentHeight;
        // сдвиг по оси y
        let position = 2;

        const imgWidth = A4_WIDTH;
        const imgHeight = (A4_WIDTH / contentWidth) * contentHeight;

        const pageData = canvas.toDataURL("image/jpg", 1.0);
        const headerGanttData = headerCanvas.toDataURL("img/jpg", 1.0);

        let currentPage = 1;
        const pages = Math.ceil(contentHeight / pageHeight);

        const headerGanttHeight = Math.floor(
          (A4_WIDTH / contentWidth) * headerCanvas.height
        );

        const pdf = new jsPDF({
          unit: "pt",
          orientation: "landscape",
          format: "a4",
        });

        if (leftHeight < pageHeight) {
          pdf.addImage(pageData, "JPEG", 0, 0, imgWidth, imgHeight);
        } else {
          while (leftHeight > 0) {
            if (currentPage === 1) {
              pdf.addImage(pageData, "JPEG", 0, 2, imgWidth, imgHeight);
            } else {
              pdf.addImage(pageData, "JPEG", 0, position, imgWidth, imgHeight);
              pdf.addImage(
                headerGanttData,
                "JPEG",
                0,
                0,
                imgWidth,
                headerGanttHeight
              );
            }

            leftHeight -= pageHeight;
            position -= A4_HEIGHT - headerGanttHeight + currentPage;
            currentPage += 1;
            // убираем пустую страницу
            if (leftHeight > 0) {
              pdf.addPage();
            }
          }
        }

        pdf.save("Отчёт.pdf");
      });
    });
});

const autoCompleteJS = new autoComplete({
  selector: "#autocomplete",
  data: {
    src: dataObjects,
    keys: ["name"],
  },
  resultList: {
    class: "autoComplete_list",
  },
  resultItem: {
    tag: "li",
    class: "autoComplete_result",
    highlight: "autoComplete_highlight",
    selected: "autoComplete_selected",
  },
  tabSelection: true,
  events: {
    input: {
      selection: (event) => {
        const selection = event.detail.selection.value.name;
        const id = event.detail.selection.value.id;

        autoCompleteJS.input.value = selection;
        setParentElementsText(parseInt(id));
        redraw(parseInt(id));
      },
    },
  },
});
