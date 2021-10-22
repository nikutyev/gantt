import JSGantt from "jsgantt-improved";
import MicroModal from "micromodal";
import {jsPDF} from "jspdf";
import html2canvas from "./html2canvas";
import autoComplete from "@tarekraafat/autocomplete.js";

import {ru} from "./lang.js";
import {getData, LOCAL_STORAGE_KEY} from "./requestHelper";

import "./jsgantt.css";
import "./main.css";
import "./micromodal.css";
import "./autocomplete.css";

const RED_TASK = "gtaskred";
const YELLOW_TASK = "gtaskyellow";
const BLUE_TASK = "gtaskblue";

function onClose(modal) {
  closeAccordion();
}

let dataObjects = [];
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

  // вычисление подкраски в зависимости от связей
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
          // если дата окончания родителя больше чем дата начала дочернего элемента, то подкрашиваются оба
          if (new Date(parent.a.it[4]) > new Date(item.a.it[3])) {
            parent.color = "gtaskgrey";
            item.color = "gtaskgrey";
          }
        }
      }
    }
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

    let color = BLUE_TASK;
    if (item.a.it[14] && planEndDate > endDate || (accepted !== 1 && endDate < today))
      color = RED_TASK;

    // если дата окончания наступит меньше чем через 3 дня
    if (endDate > today && endDate - today < 3600000 * 24 * 60)
      color = YELLOW_TASK;

    if (item.color)
      color = item.color;

    g.AddTaskItemObject({
      pID: parseInt(item.k),
      pName: item.n,
      // pStart: settings.showBaseVersion ? item.a.it[15] : item.a.it[3],
      pStart: item.a.it[3],
      // pEnd: settings.showBaseVersion ? item.a.it[16] : item.a.it[4],
      pEnd: item.a.it[4],
      // pPlanStart: settings.showPredictedDate ? item.a.it[3] : "",
      pPlanStart: settings.showBaseVersion ? item.a.it[15] : (settings.showPredictedDate ? item.a.it[3] : ""),
      // pPlanEnd: settings.showPredictedDate ? item.a.it[14] : "",
      pPlanEnd: settings.showBaseVersion ? item.a.it[16] : (settings.showPredictedDate ? item.a.it[14] : ""),
      // pClass: settings.showBaseVersion ? "gtaskgrey" : "gtaskblue",
      pClass: settings.showBaseVersion ? BLUE_TASK : color,
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

function closeAccordion() {
  const activeTabs = document.querySelectorAll(".modal_list-title.active");

  activeTabs.forEach((item) => {
    item.click();
  });
}

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

const saveToPdf = document.getElementById("saveToPdf");

saveToPdf.addEventListener("click", () => {
  MicroModal.show("loader");
  const wrapper = document.querySelector(".wrapper");

  const wrapperConfig = {
    logging: true,
    onclone: (el) => {
      const cloneDosumentWidth = 1920;
      const wrapperClone = el.querySelector(".wrapper");
      const ganttClone = wrapperClone.querySelector(".gantt");
      const modal = wrapperClone.querySelector("#loader");

      wrapperClone.removeChild(modal);

      const footerLeft = ganttClone.querySelector(
        ".gmainleft .gtasktable tbody tr:last-child"
      );
      const footerRight = ganttClone.querySelector(
        ".gmainright .gcharttable tfoot .footerdays"
      );

      footerLeft.style.display = "none";
      footerRight.style.display = "none";

      wrapperClone.style.width = `${cloneDosumentWidth}px`;
    },
  };

  html2canvas(wrapper, wrapperConfig).then((canvas) => {
    let images = calculateDiffs(canvas);
    setTimeout(() => {
      createPdf2(canvas, images);
    });
  });
});

function calculateDiffs(canvas) {
  const pageHeight = 1320;
  const secondPageHeight = 1240;
  let images = [];
  let wrapperHeight = document
    .querySelector(".wrapper")
    .getBoundingClientRect().height;

  function putImagePartIntoImg(context, imgDivId, x, y, width, height) {
    let imageData = context.getImageData(x, y, width, height);
    let canvasPart = document.createElement("canvas");
    let contextPart = canvasPart.getContext("2d");
    canvasPart.width = width;
    canvasPart.height = height;
    contextPart.putImageData(imageData, 0, 0);
    images.push(canvasPart.toDataURL("image/jpg", 0.6));
    // document.body.append(canvasPart);
  }

  let page = 0;
  let image = new Image();
  let headerImg = "";

  image.onload = function () {
    let context = canvas.getContext("2d");
    let copyContext = canvas.getContext("2d");

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    putImagePartIntoImg(copyContext, "left", 0, 240, image.width, 80);
    headerImg = images[0];

    while (wrapperHeight > 0) {
      if (page === 0) {
        putImagePartIntoImg(
          context,
          "left",
          0,
          pageHeight * page,
          image.width,
          pageHeight
        );

        wrapperHeight -= pageHeight;
      } else if (page === 1) {
        putImagePartIntoImg(
          context,
          "left",
          0,
          pageHeight * page,
          image.width,
          secondPageHeight
        );

        wrapperHeight -= secondPageHeight;
      } else {
        putImagePartIntoImg(
          context,
          "left",
          0,
          (secondPageHeight + 40) * page,
          image.width,
          secondPageHeight
        );
        wrapperHeight -= secondPageHeight;
      }

      page += 1;
    }
  };

  image.src = canvas.toDataURL("image/jpg", 0.6);

  return images;
}

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
        displaySettings.object = null;
        redraw(parseInt(id));
      },
    },
  },
});
