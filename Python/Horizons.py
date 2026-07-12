import requests

def get_earth_state():
    url = "https://ssd.jpl.nasa.gov/api/horizons.api"

    params = {
        "format": "json",
        "COMMAND": "399",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",
        "CENTER": "500@10",
        "START_TIME": "2026-01-01",
        "STOP_TIME": "2026-01-02",
        "STEP_SIZE": "1d",
        "VEC_TABLE": "2"
    }

    response = requests.get(url, params=params)
    data = response.json()

    raw_text = data["result"]

    start = raw_text.find("$$SOE")
    end = raw_text.find("$$EOE")

    useful_text = raw_text[start:end]

    x_start = useful_text.find("X =")
    y_start = useful_text.find("Y =")
    z_start = useful_text.find("Z =")

    vx_start = useful_text.find("VX=")
    vy_start = useful_text.find("VY=")
    vz_start = useful_text.find("VZ=")

    x_text = useful_text[x_start + 3:y_start]
    y_text = useful_text[y_start + 3:z_start]
    z_text = useful_text[z_start + 3:vx_start]

    vx_text = useful_text[vx_start + 3:vy_start]
    vy_text = useful_text[vy_start + 3:vz_start]

    line_end = useful_text.find("\n", vz_start)
    vz_text = useful_text[vz_start + 3:line_end]

    x = float(x_text)
    y = float(y_text)
    z = float(z_text)

    vx = float(vx_text)
    vy = float(vy_text)
    vz = float(vz_text)

    position = [x, y, z]
    velocity = [vx, vy, vz]

    return {
        "name": "Earth",
        "center": "Sun",
        "position": position,
        "velocity": velocity,
        "position_units": "km",
        "velocity_units": "km/s"
    }