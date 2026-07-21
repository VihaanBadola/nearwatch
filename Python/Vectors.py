import numpy as np

# Creates the
def get_vector(pos1, pos2):
    return pos2 - pos1
    
def get_magnitude(vector):
    return np.linalg.norm(vector)

def get_unit_vector(vector):
    return vector / get_magnitude(vector)

