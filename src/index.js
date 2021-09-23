import JSGantt from "jsgantt-improved";
import MicroModal from "micromodal";

import { ru } from "./lang.js";
import { getData } from "./requestHelper";

import "./jsgantt.css";
import "./main.css";
import "./micromodal.css";

const parentElementsText = document.querySelector("#parent_elements");
const acceptedSelect = document.querySelector("#accepted_select");
const expandSelect = document.querySelector("#expand_select");
const hideOldSelect = document.querySelector("#hide_old_select");

const data = getData();

const array = data.OpenDimResult.meta.els.els.e;

const displaySettings = {
  acceptedStatus: null,
  hideOldTasks: false,
  expandAll: false,
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
    vDayMajorDateDisplayFormat: "mon yyyy - Week ww",
    vWeekMinorDateDisplayFormat: "dd mon",
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
  g.setShowTaskInfoNotes(0);
  g.setShowComp(0);
  g.setShowTaskInfoComp(0);
  g.setShowPlanStartDate(0);
  g.setShowPlanEndDate(0);
  g.setShowStartDate(0);
  g.setShowEndDate(0);
  g.setShowDur(0);

  let index = getItemIndex(parentKey) + 1;
  let items = [];
  while (true) {
    const item = array[index];
    const level = parseInt(item.a.it[7]);
    if (!level || level === 0) break;
    items.push(item);
    index++;
  }

  const today = new Date();
  items = items.filter(
    (item) =>
      (!settings.acceptedStatus || item.a.it[8] == settings.acceptedStatus) &&
      (!settings.hideOldTasks || new Date(item.a.it[4]) > today)
  );

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const next = items[i + 1];
    const level = parseInt(item.a.it[7]);
    // const accepted = item.a.it[8];

    g.AddTaskItemObject({
      pID: parseInt(item.k),
      pName: item.n,
      pStart: item.a.it[3],
      pEnd: item.a.it[4],
      pClass:
        item.o - 1 < 4 && item.o - 1 > 0
          ? "gtaskblue" + (item.o - 1)
          : "gtaskblue",
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
      pDepend: "",
      pCaption: "",
      pNotes: "",
    });
  }

  g.Draw();
}

function setParentElementsText(key) {
  let item = array[getItemIndex(key)];
  let text = item.n;
  while (item.p && item.p.length > 0) {
    item = array[getItemIndex(item.p)];
    text = item.n + " > " + text;
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

buildModalList();
setFirstItemSelected();
