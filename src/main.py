from pystac_client import Client
import odc.stac
import dask.distributed
import matplotlib.pyplot as plt
import numpy as np
import dotenv
import os

#Env
dotenv.load_dotenv()
STAC_ENDPOINT = os.getenv("STAC_ENDPOINT")

def main():
    # 1. Connect to the Copernicus Data Space STAC API
    endpoint = STAC_ENDPOINT
    catalog = Client.open(endpoint)

    # 2. Define your farm's area of interest (AOI)
    # [min_lon, min_lat, max_lon, max_lat]
    aoi = [112.703272, -7.608111, 112.714636, -7.596883]

    stac_items = catalog.search(
        bbox=aoi,
        collections=["sentinel-2-l2a"],
        sortby=[{"field": "properties.datetime", "direction": "desc"}],
        max_items=1
    ).item_collection()
    print(f"Found {len(stac_items)} items")

    client = dask.distributed.Client()
    print(client.dashboard_link)

    odc.stac.configure_rio(cloud_defaults=True, verbose=True, aws={"aws_unsigned": True})
    xx = odc.stac.load(
        stac_items,
        #crs="EPSG:3857",
        bands=["red", "green", "blue"],
        resolution=1,
        #stac_cfg=stac_cfg,
        bbox=aoi,
        chunks={"x": 2048, "y": 2048},
    )
    print('Done')
    print(xx)
    #xx.red.plot.imshow(col="time")
    ds = xx.compute()
    #ds.red.plot.imshow(col="time")
    #ds.green.plot.imshow(col="time")
    #ds.blue.plot.imshow(col="time")
    img = ds[['red', 'green', 'blue']].isel(time=0)
    img = img.to_array().values.transpose(1,2,0)
    img = (img/3000.0).clip(0,1)
    print(img)
    plt.imshow(img)
    
    plt.show()
    print("All Done!!!")

if __name__ == "__main__":
    main()