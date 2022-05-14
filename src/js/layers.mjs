const layerCategories = [
    // categories
    {
        name: "buildings",
        displayName: "Gebäude",
        isBaseLayerCategory: false,
        show: true,
        layers: [
            {
                name: "osmBuildings",
                displayName: "OSM Gebäude",
                thumbnailSrc: "",
                show: false,
                opacity: 100,
                tooltip: "Gebäude aus OpenStreetMap.",
                credit: ""
            },
            {
                name: "cityModel",
                displayName:  "Stadtmodell",
                thumbnailSrc: "",
                show: false,
                opacity: 100,
                tooltip: "Das 3D-Stadtmodell der Stadt Herne.",
                credit: ""
            }
        ]  
    },
    {
        name: "baseLayers",
        displayName: "Basis-Daten",
        isBaseLayerCategory: true,
        show: true,
        subCategories: [
            {
                name: "imagery",
                displayName: "Bild-Daten",
                isBaseLayerCategory: true,
                layers: [
                    // Default cesium imagery gets inserted here at runtime
                    // 2021
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2021",
                        displayName:  "Luftbilder 2021 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2021",
                        layerName: "dop_2021",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus dem Jahr 2021. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/d954a982-a436-48ba-8c11-9ad0222ae22f)"
                    },
                    // 2019
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2019",
                        displayName:  "Luftbilder 2019 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2019",
                        layerName: "dop_2019",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2011 bis 2019. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/dbc9533a-8f13-4879-a814-85ebc3ecec10)"
                    },
                    // 2017
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2017",
                        displayName:  "Luftbilder 2017 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2017",
                        layerName: "dop_2017",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2011 bis 2017. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/c88b0f40-8139-4b1b-accd-fa66a42e4012)"
                    },
                    // 2015
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2015",
                        displayName:  "Luftbilder 2015 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2015",
                        layerName: "dop_2015",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2009 bis 2015. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/94df5d0f-61fd-400d-b1ce-5cd2d619e99d)"
                    },
                    // 2013
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2013",
                        displayName:  "Luftbilder 2013 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2013",
                        layerName: "dop_2013",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2009 bis 2013. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/7e8c6704-08f4-4cdd-9bab-7a97d4754d0d)"
                    },
                    // 2011
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2011",
                        displayName:  "Luftbilder 2011 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2011",
                        layerName: "dop_2011",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2009 bis 2011. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/search/api/records/beeb0470-4b0e-4930-91ec-5619f6d53026)"
                    },
                    // 2009
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2009",
                        displayName:  "Luftbilder 2009 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2009",
                        layerName: "dop_2009",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus dem Jahr 2009. Sie sind mit einer Bodenauflösung von 0,2 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/e2543f1b-506a-44ac-8939-b51393d920a2)"
                    },
                    // 2006
                    {
                        type: "WMS",
                        name: "aerialImageRVR_2006",
                        displayName:  "Luftbilder 2006 (DOP)",
                        url: "https://geodaten.metropoleruhr.de/dop/dop_2006",
                        layerName: "dop_2006",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus dem Jahr 2006. Sie sind mit einer Bodenauflösung von 0,31 m beflogen.",
                        credit: "DOP: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/0e0ad8d1-4a19-404b-91c6-a74f7d5487e1)"
                    },
                    // 1998
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1998",
                        displayName:  "Luftbilder 1998",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1998",
                        layerName: "lubi_1998",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1998 bis 2003 (überwiegend 1998). Sie sind mit einer Bodenauflösung von 0,5 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/4b28aa6c-ec7f-4ab8-89f3-65503fc49440)"
                    },
                    // 1990
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1990",
                        displayName:  "Luftbilder 1990",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1990",
                        layerName: "lubi_1990",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1983 bis 1990 (überwiegend 1990). Sie sind mit einer Bodenauflösung von 0,5 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://www.rvr.ruhr/)"
                    },
                    // 1969
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1969",
                        displayName:  "Luftbilder 1969",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1969",
                        layerName: "lubi_1969",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1957 bis 1980 (überwiegend 1969). Sie sind mit einer Bodenauflösung von 0,3175 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/a0331105-f2c3-4727-8dfa-a386512ed91a)"
                    },
                    // 1963
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1963",
                        displayName:  "Luftbilder 1963",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1963",
                        layerName: "lubi_1963",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1963 bis 1968 (überwiegend 1963). Sie sind mit einer Bodenauflösung von 1,875 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/75d6434e-e73a-4470-b0ce-536a43a37225)"
                    },
                    // 1952
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1952",
                        displayName:  "Luftbilder 1952",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1952",
                        layerName: "lubi_1952",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1951 bis 1980 (überwiegend 1952). Sie sind mit einer Bodenauflösung von 0,32 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/a0edf4e2-58c3-4d0d-b5dc-c0005fb5b50f)"
                    },
                    // 1934
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1934",
                        displayName:  "Luftbilder 1934",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1934",
                        layerName: "lubi_1934",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1934 - 1939 (überwiegend 1934).Sie sind mit einer Bodenauflösung von 1,875 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://daten.geoportal.ruhr/srv/api/records/1803ceb9-ac6b-4f19-b042-f7b73c4dcfce)"
                    },
                    // 1926
                    {
                        type: "WMS",
                        name: "aerialImageRVR_1926",
                        displayName:  "Luftbilder 1926",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1926",
                        layerName: "lubi_1926",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1925 bis 1930 (überwiegend 1926). Sie sind mit einer Bodenauflösung von 0,35 m beflogen.",
                        credit: "Luftbild: © [Regionalverband Ruhr](https://www.rvr.ruhr/)"
                    },
                ] 
            },
            {
                name: "terrain",
                displayName: "Terrain",
                isBaseLayerCategory: true,
                layers: [
                    {
                        name: "dgm1m",
                        displayName:  "DGM 1m",
                        thumbnailSrc: "",
                        show: false,
                        opacity: 100,
                        tooltip: "Das Digitale Geländemodell von Geobasis NRW in 1m Auflösung.",
                        credit: ""
                    },
                    {
                        name: "dgm10m",
                        displayName:  "DGM 10m",
                        thumbnailSrc: "",
                        show: false,
                        opacity: 100,
                        tooltip: "Das Digitale Geländemodell von Geobasis NRW in 10m Auflösung.",
                        credit: ""
                    },
                    {
                        name: "dgm25m",
                        displayName:  "DGM 25m",
                        thumbnailSrc: "",
                        show: false,
                        opacity: 100,
                        tooltip: "Das Digitale Geländemodell von Geobasis NRW in 25m Auflösung.",
                        credit: ""
                    },
                    {
                        name: "dgm50m",
                        displayName:  "DGM 50m",
                        thumbnailSrc: "",
                        show: false,
                        opacity: 100,
                        tooltip: "Das Digitale Geländemodell von Geobasis NRW in 50m Auflösung.",
                        credit: ""
                    },
                ] // default cesium terrain gets inserted here at runtime
            },
        ]
    }
    
]

export { layerCategories };