import JSGantt from 'jsgantt-improved';
import MicroModal from 'micromodal';

import {ru} from "./lang.js";
import {a} from "./response.js";

import "./jsgantt.css";
import "./main.css";
import "./micromodal.css";


const g = new JSGantt.GanttChart(document.getElementById('GanttChartDIV'), 'day');
const parentElementsText = document.querySelector("#parent_elements");

g.addLang('ru1', ru);

g.setOptions({
    vCaptionType: 'Complete',  // Set to Show Caption : None,Caption,Resource,Duration,Complete,
    vQuarterColWidth: 36,
    vDateTaskDisplayFormat: 'dd.mm.yyyy', // Shown in tool tip box
    vDayMajorDateDisplayFormat: 'mon yyyy - Week ww',// Set format to dates in the "Major" header of the "Day" view
    vWeekMinorDateDisplayFormat: 'dd mon', // Set format to display dates in the "Minor" header of the "Week" view
    vLang: 'ru1',
    vShowTaskInfoLink: 0, // Show link in tool tip (0/1)
    vShowEndWeekDate: 0,  // Show/Hide the date for the last day of the week in header for daily
    vUseSingleCell: 10000, // Set the threshold cell per table row (Helps performance for large data.
    vFormatArr: ['Day', 'Week', 'Month', 'Quarter'], // Even with setUseSingleCell using Hour format on such a large chart can cause issues in some browsers,
});
g.setDateTaskTableDisplayFormat("dd.mm.yyyy");

const res = JSON.parse(a);

const array = res.OpenDimResult.meta.els.els.e;

const pItems = [];
for (let i = 0; i < array.length; i++) {
    if (parseInt(array[i].a.it[7]) === 0 && array[i].n !== "ИТОГО")
        pItems.push(array[i]);
}

function getItemIndex(key) {
    for (let i = 0; i < array.length; i++)
        if (parseInt(array[i].k) === parseInt(key))
            return i;
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

function drawChildren(key) {
    let index = getItemIndex(key) + 1;
    g.ClearTasks();

    while (true) {
        const item = array[index];
        const next = array[index + 1];
        const level = parseInt(item.a.it[7]);
        if (!level || level === 0)
            break;

        let notes = "";
        const accepted = parseInt(item.a.it[8]);
        if (accepted === 1 || accepted === 0) {
            notes += "Согласовано: " + (accepted === 1 ? "Да" : "Нет");
        }

        g.AddTaskItemObject({
            pID: parseInt(item.k),
            pName: item.n,
            pStart: item.a.it[3],
            pEnd: item.a.it[4],
            pClass: "gtaskblue",
            pLink: "",
            pMile: 0,
            pRes: item.a.it[5],
            pComp: 0,
            pGroup: next && next.p === item.k ? 1 : 0,
            pParent: level > 1 && item.p !== undefined && item.p.length > 0 ? parseInt(item.p) : 0,
            pOpen: 0,
            pDepend: "",
            pCaption: "",
            pNotes: notes,
        });
        index++;
    }

    g.Draw();
}

function setFirstItemSelected() {
    for (let i = 0; i < array.length; i++) {
        if (parseInt(array[i].a.it[7]) === 0 && parseInt(array[i + 1].a.it[7]) === 1) {
            drawChildren(parseInt(array[i].k));
            setParentElementsText(parseInt(array[i].k));
            break;
        }
    }
}

function buildModalList() {
    const listEl = document.querySelector("#modal_list");
    for (let i = 0; i < pItems.length; i++) {
        const item = pItems[i];
        const next = pItems[i + 1];
        const li = document.createElement("li");
        li.innerHTML = item.n;
        if (!next || item.k !== next.p) {
            li.addEventListener("click", () => {
                MicroModal.close('modal-1');
                setParentElementsText(parseInt(item.k));
                drawChildren(parseInt(item.k));
            });
            li.classList.add("clickable");
            li.classList.add("list-child");
        }
        listEl.append(li);
    }
}

parentElementsText.addEventListener("click", () => {
    MicroModal.show('modal-1');
});

buildModalList();
setFirstItemSelected();
