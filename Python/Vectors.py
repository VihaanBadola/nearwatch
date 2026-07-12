import numpy as np

def get_vector(pos1, pos2):
    return pos2 - pos1
    
def get_magnitude(vector):
    return np.linalg.norm(vector)

def get_unit_vector(vector):
    return vector / get_magnitude(vector)


# if __name__ == "__main__":
#     earth_position = np.array([149597870700, 0, 0])
#     sun_position = np.array([0, 0, 0])

#     direction = get_vector(earth_position, sun_position)
#     distance = get_magnitude(direction)
#     unit = get_unit_vector(direction)

#     print("Direction to Sun:", direction)
#     print("Distance to Sun:", distance)
#     print("Unit direction to Sun:", unit)