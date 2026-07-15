import requests

def get_earth_state():
    # JPL Horizons API endpoint for ephemeris data
    url = "https://ssd.jpl.nasa.gov/api/horizons.api"

    params = {
        "format": "json",
        "COMMAND": "399",       # 399 = Earth
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",  # request position/velocity vectors, not orbital elements
        "CENTER": "500@10",       # centered on the Sun
        "START_TIME": "2026-01-01",
        "STOP_TIME": "2026-01-02",
        "STEP_SIZE": "1d",
        "VEC_TABLE": "2"          # table 2 = position + velocity
    }

    response = requests.get(url, params=params)
    data = response.json()

    # The API returns one big text blob; the actual vector data sits between these markers ("Start/End Of Ephemeris")
    raw_text = data["result"]

    start = raw_text.find("$$SOE")
    end = raw_text.find("$$EOE")

    useful_text = raw_text[start:end]

    # Find where each labeled value starts in the text block
    x_start = useful_text.find("X =")
    y_start = useful_text.find("Y =")
    z_start = useful_text.find("Z =")

    vx_start = useful_text.find("VX=")
    vy_start = useful_text.find("VY=")
    vz_start = useful_text.find("VZ=")

    # Slice out each value's text using the next label's position as the end boundary
    x_text = useful_text[x_start + 3:y_start]
    y_text = useful_text[y_start + 3:z_start]
    z_text = useful_text[z_start + 3:vx_start]

    vx_text = useful_text[vx_start + 3:vy_start]
    vy_text = useful_text[vy_start + 3:vz_start]

    # VZ is the last value on its line, so bound it by the newline instead
    line_end = useful_text.find("\n", vz_start)
    vz_text = useful_text[vz_start + 3:line_end]

    # Convert the extracted substrings to actual numbers
    x = float(x_text)
    y = float(y_text)
    z = float(z_text)

    vx = float(vx_text)
    vy = float(vy_text)
    vz = float(vz_text)

    position = [x, y, z]
    velocity = [vx, vy, vz]

    # Package everything into the standard state vector dict used across the app
    return {
        "name": "Earth",
        "center": "Sun",
        "position": position,
        "velocity": velocity,
        "position_units": "km",
        "velocity_units": "km/s"
    }
