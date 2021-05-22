import os

files = [os.path.join(r, file) for r, d, f in os.walk("dist") for file in f]

for file in files:
    temp = file.replace("\\", "/")
    temp = temp.replace("dist/", "")
    print("'{0}',".format(temp))
