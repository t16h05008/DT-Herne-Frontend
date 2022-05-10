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

            },
            {
                name: "cityModel",
                displayName:  "Stadtmodell",
                thumbnailSrc: "",
                show: false,
                opacity: 100,
                tooltip: "Das 3D-Stadtmodell der Stadt Herne.",
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
                    // Only one imagery layer can be shown
                    // 2021
                    {
                        type: "WMS",
                        name: "aerialImages2021",
                        displayName:  "Luftbilder 2021 (DOP)",
                        url: "https://geodaten.herne.de/gisserver/luftbilder/2021",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Luftbilder von April 2021.",
                    },
                    // 2019
                    {
                        type: "WMS",
                        name: "aerialImages2019",
                        displayName:  "Luftbilder 2019 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2019#dop_2019",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2011 bis 2019. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                    },
                    // 2017
                    {
                        type: "WMS",
                        name: "aerialImages2017",
                        displayName:  "Luftbilder 2017 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2017#dop_2017",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2011 bis 2017. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                    },
                    // 2017
                    {
                        type: "WMS",
                        name: "aerialImages2017",
                        displayName:  "Luftbilder 2017 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2017#dop_2017",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2011 bis 2017. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                    },
                    // 2015
                    {
                        type: "WMS",
                        name: "aerialImages2015",
                        displayName:  "Luftbilder 2015 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2015#dop_2015",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2009 bis 2015. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                    },
                    // 2013
                    {
                        type: "WMS",
                        name: "aerialImages2013",
                        displayName:  "Luftbilder 2013 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2013#dop_2013",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2009 bis 2013. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                    },
                    // 2011
                    {
                        type: "WMS",
                        name: "aerialImages2011",
                        displayName:  "Luftbilder 2011 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2011#dop_2011",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus den Jahren 2009 bis 2011. Sie sind mit einer Bodenauflösung von 0,1 m beflogen.",
                    },
                    // 2009
                    {
                        type: "WMS",
                        name: "aerialImages2009",
                        displayName:  "Luftbilder 2009 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2009#dop_2009",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus dem Jahr 2009. Sie sind mit einer Bodenauflösung von 0,2 m beflogen.",
                    },
                    // 2006
                    {
                        type: "WMS",
                        name: "aerialImages2006",
                        displayName:  "Luftbilder 2006 (DOP)",
                        url: "wms:https://geodaten.metropoleruhr.de/dop/dop_2006#dop_2006",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitale Orthofotos des RVR aus dem Jahr 2006. Sie sind mit einer Bodenauflösung von 0,31 m beflogen.",
                    },
                    // 1998
                    {
                        type: "WMS",
                        name: "aerialImages1998",
                        displayName:  "Luftbilder 1998",
                        url: "wms:https://geodaten.metropoleruhr.de/lubi/lubi_1998#lubi_1998",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1998 bis 2003 (überwiegend 1998). Sie sind mit einer Bodenauflösung von 0,5 m beflogen.",
                    },
                    // 1990
                    {
                        type: "WMS",
                        name: "aerialImages1990",
                        displayName:  "Luftbilder 1990",
                        url: "wms:https://geodaten.metropoleruhr.de/lubi/lubi_1990#lubi_1990",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1983 bis 1990 (überwiegend 1990). Sie sind mit einer Bodenauflösung von 0,5 m beflogen.",
                    },
                    // 1969
                    {
                        type: "WMS",
                        name: "aerialImages1969",
                        displayName:  "Luftbilder 1969",
                        url: "wms:https://geodaten.metropoleruhr.de/lubi/lubi_1969#lubi_1969",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1957 bis 1980 (überwiegend 1969). Sie sind mit einer Bodenauflösung von 0,3175 m beflogen.",
                    },
                    // 1963
                    {
                        type: "WMS",
                        name: "aerialImages1963",
                        displayName:  "Luftbilder 1963",
                        url: "wms:https://geodaten.metropoleruhr.de/lubi/lubi_1963#lubi_1963",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1963 bis 1968 (überwiegend 1963). Sie sind mit einer Bodenauflösung von 1,875 m beflogen.",
                    },
                    // 1952
                    {
                        type: "WMS",
                        name: "aerialImages1952",
                        displayName:  "Luftbilder 1952",
                        url: "wms:https://geodaten.metropoleruhr.de/lubi/lubi_1952#lubi_1952",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1951 bis 1980 (überwiegend 1952). Sie sind mit einer Bodenauflösung von 0,32 m beflogen.",
                    },
                    // 1934
                    {
                        type: "WMS",
                        name: "aerialImages1934",
                        displayName:  "Luftbilder 1934",
                        url: "wms:https://geodaten.metropoleruhr.de/lubi/lubi_1934#lubi_1934",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1934 - 1939 (überwiegend 1934).Sie sind mit einer Bodenauflösung von 1,875 m beflogen.",
                    },
                    // 1926
                    {
                        type: "WMS",
                        name: "aerialImages1926",
                        displayName:  "Luftbilder 1926",
                        url: "https://geodaten.metropoleruhr.de/lubi/lubi_1926",
                        layerName: "lubi_1926",
                        thumbnailSrc: "static/images/thumb-aerial-imagery-2021.webp",
                        show: false,
                        opacity: 100,
                        tooltip: "Digitalisierte Luftbilder des RVR aus den Jahren 1925 bis 1930 (überwiegend 1926). Sie sind mit einer Bodenauflösung von 0,35 m beflogen.",
                    },
                ] 
            },
            {
                name: "terrain",
                displayName: "Terrain",
                isBaseLayerCategory: true,
                layers: [] // default cesium terrain gets inserted here at runtime
            }
        ]
    }
    
]

export { layerCategories };