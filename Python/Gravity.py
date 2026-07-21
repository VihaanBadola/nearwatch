
import numpy as np
from Vectors import get_vector, get_magnitude, get_unit_vector

GM_SUN = 1.327e11

gravitational_constant = 6.67430e-11
mass_sun = 1.9885e30
mass_earth = 5.9722e24
distance_sun_earth = 149597870700


def gravitational_force(body1_mass,body2_mass,distance_between):
    g_force =  (gravitational_constant * body1_mass * body2_mass)/(distance_between**2)
    return g_force 

FgSunEarth = gravitational_force(mass_sun, mass_earth, distance_sun_earth)
print(f"Gravitational Force between Sun and Earth: {FgSunEarth:.3e} N")



def get_acceleration(position, cp=np.array([0, 0, 0])):
    r_vector = get_vector(position, cp)
    r = get_magnitude(r_vector)
    direction = get_unit_vector(r_vector)
    
    accel_magnitude = GM_SUN / (r ** 2)
    acceleration = -accel_magnitude * direction
    
    return acceleration