# Introduction

Angular implementation of Power Fx Formula Bar from [Power Fx WebDemo](https://github.com/microsoft/power-fx-host-samples/tree/main/Samples/WebDemo)

---

Demonstrates a web page hosting the Power Fx Formula Bar and doing evaluation. 
The formula bar is a client-side ~~react~~ angular control that wraps the[ Monaco editor](https://microsoft.github.io/monaco-editor/) to provide features like error squiggles, completion suggestions, and function tool tips. 

![image](https://user-images.githubusercontent.com/1538900/143385087-c086a26c-9f0d-4989-b5b5-0fe489ebc314.png)

# Build locally 

1. Open and run `.\Service\PowerFxService.sln` in VS2019. 
Be sure you're running in VS2019 (not an earlier version), and that you run via "PowerFxService" and not via IISExpress. 
This will build and run the LSP and Eval service at https://localhost:5001
These are just backend APIs and don't produce any UI. 

2. Build the client-side formula bar in the `.\app` folder. 
- `yarn`
- `yarn start`

This will launch a webpage at  http://localhost:4200 hosting the formula bar control. This page will call the service from step 1. 

# Deploy
1. in `.\app`, run `yarn build`
This will produce static build files in the `.\app\dist` directory. 
Copy these to the wwwroot. 

2. Deploy the service to the same site. 

