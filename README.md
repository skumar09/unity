## Table of Contents
- [Installation](#installation)
- [Architecture](#architecture)
- [Places to look](#placesToLook)
- [Consumption](#consumption)
- [Contributing](#contributing)


## Installation

Unity is a Milo bootstrap project.
1. Install the [aem CLI](https://www.npmjs.com/package/@adobe/aem-cli): `sudo npm install -g @adobe/aem-cli`
1. Run `aem up` this repo's folder. (opens your browser at `http://localhost:3000`)
1. Open this repo's folder in your favorite editor and start coding.

## Architecture
Unity UI will be connected to Unity Service for most of the operation. Below are some of the operations by unity service

1. Remove background
1. Change Background
1. Redirect to Acrobat

Apart from this some operations can be performed in client side for better user experience like: image filters, crop, ans resize etc.

[Unity UI architecture](https://wiki.corp.adobe.com/display/adobedotcom/Unity+Architecture)

[Unity Service architecture](https://wiki.corp.adobe.com/display/~shasmish/SAPS+Unity+Service)


## Places to look
All the Unity assets resides at [folder](https://adobe.sharepoint.com/:f:/r/sites/adobecom/Shared%20Documents/unity/unity/assets). This will be accessible from [https://adobe.com/unity/assets](https://adobe.com/unity/assets)


All the Unity configs resides at [folder](https://adobe.sharepoint.com/:f:/r/sites/adobecom/Shared%20Documents/unity/unity/configs). This will be accessible from [https://adobe.com/unity/configs](https://adobe.com/unity/configs)


All the Unity code can be acesses from [https://adobe.com/unity/unitylibs](https://adobe.com/unity/unitylibs)

A specific version of Unity branch can be loaded by passing ```?unitylibs=<branch_name>``` as query paramter.

## Consumption

### Milo consumption
All the Milo consuming projects will get the Unity blocks OOTB.
All though the core Unity functionality resides in this repo, Milo has a light weight unity block whose repsonsibility is to load the unity core functionality. Unity block is not a visual block and works as a metadata block for other blocks(e.g Marquee, Aside) where we need unity features to be enabled.

### Unity with Custom Block
Unity block can be added after any other block to take the effect. We need to pass a target element(selector) where we need unity feature/ 

### IMS guest token
Unity Service depends on IMS guest token for logged out user. So IMS client id should be onboarded with IMS guest token [wiki](https://wiki.corp.adobe.com/pages/viewpage.action?spaceKey=~nzotta&title=Guest+Sessions+-+Identity+components+delivery+schedules%2C+integration+and+testing).


## Contributing

### Submitting PR

1. PR needs at least two approvals.
1. Approvals & changes can come from anyone.
1. Unity Contributors can send PRs from forks.
1. Unity Committers can merge approved PRs into any branch besides stage or main.
1. Unity Admins can merge approved PRs into stage and main.
1. We recommend the following title format for PR:
    ```bash
    MWPW-xxxx - Summarize changes in 50 characters or less
    ```
