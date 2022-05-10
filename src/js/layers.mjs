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
                layers: [] // default cesium imagery gets inserted here at runtime
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