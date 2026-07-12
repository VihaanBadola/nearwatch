gravitational_constant = 6.67430e-11
mass_sun = 1.9885e30
mass_earth = 5.9722e24
distance_sun_earth = 149597870700


def gravitational_force(body1_mass,body2_mass,distance_between):
    g_force =  (gravitational_constant * body1_mass * body2_mass)/(distance_between**2)
    return g_force 

FgSunEarth = gravitational_force(mass_sun, mass_earth, distance_sun_earth)
print(f"Gravitational Force between Sun and Earth: {FgSunEarth:.3e} N")

