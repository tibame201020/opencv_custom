# Virtual Workflow Editor 說明
## 1. 簡介
```
目前此專案提供 code-editor在前端讓使用者可以編輯python script程式碼，
然後透過execution執行腳本，並將console即時顯示在前端。
也透過manage可以import, delete腳本專案
然而script的存在是希望讓重複性的事務可以被自動化，
但目前pyhton script的編輯方式對於非工程師來說並不友善，
因此希望推出另一種類似n8n graph workflow的編輯方式。

然而經過驗證，我確定了script code與workflow的即時互相轉換並不容易實現。
code to workflow 沒辦法保存workflow的圖形位置，
workflow to code 沒辦法保存code的註解，
因此我決定將workflow視為一個獨立的功能。

也就是說會提供兩種runtime，
1. script runtime
2. workflow runtime

不過在execution保持單一入口，只是runtime會由我們自己負責。
```

## 2. 參考
因為我對於java比較熟悉，所以先用java實作一個poc，這邊提供給你參考
要注意到的就是邏輯判斷除了if-else以外，是用subflow as node來處理while,for loop, for each, case when等邏輯判斷
```
workflow_poc_detail.md
WorkflowPoc.java
WorkflowPocTest.java
```

## 3. 需求
```
1. 開一個local branch來實作
2. 提供一個類似n8n的graph workflow編輯器
3. 提供一個類似n8n的workflow執行器
4. 提供一個類似n8n的workflow管理介面
5. 也需要提供text editor的workflow編輯方式，但是使用yaml格式
6. workflow與node等相關的persistence是保存在sqlite
7. 因為對於使用者來說，我們只是提供另一種編輯方式，所以前端介面要與目前的code-editor保持一致(左側的project, file explorer)，只是text-editor介面改成graph-editor | yaml-editor
8. 還是需要提供code to workflow, workflow to code的轉換, 但因為前面提到的限制，所以轉換後的結果會失去一些資訊(workflow位置, code註解)，這點需要讓使用者知道
9. node要提供基本的邏輯subflow as node, 像是if-else, while, for loop, for each, case when等
10. 目前的node也需要有`core\script\script_interface.py`, `core\service`提供的功能, 這樣才能讓使用者透過編輯workflow組成一個script.
11. node的方式可以是register, publish, 或是自動發現, 這邊交由你來判斷
```

** 注意: 不要影響到目前python-script-editor的編輯以及執行方式 **
** 前端UIUX要保持一致, 且善用react-flow, daisyUI, tailwindcss不要使用原生的alert confirm **