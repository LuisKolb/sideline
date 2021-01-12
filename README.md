Sideline
==============
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/LuisKolb/subplots-binder-demo/HEAD)  

Focus on the narrative you want to tell and show code for data cleaning, exploration, and related tasks only on demand.  

Installation
-----


You can get a Docker Image from [DockerHub](https://hub.docker.com/repository/docker/luiskolb/sideline) with `docker pull luiskolb/sideline`. Running the image will start a Notebook server on your local machine, which comes with sideline preinstalled (and many other packages, as it is based on the [jupyter/scipy-notebook image](https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html#jupyter-datascience-notebook))!  
IMPORTANT: run the docker image with this command `docker run -p 8888:8888 luiskolb/sideline` to specify port mapping, or you would not be able to access the server from your browser (which runs outside of the container on your local machine). If you are somewhat experienced with docker, you can set up volumes when running the container to access files outside of the container. Chances are though, if you want to acutally work with the extension you should read on and install it in your local Jupyter installation.  


Installing the extension manually:  

Ensure Jupyter Notebook is installed first (https://jupyter.org/install)  

Execute these commands:  

`git clone https://github.com/LuisKolb/sideline.git`  
`jupyter nbextension install sideline`  
`jupyter nbextension enable sideline/main` (note: the entry point is main, not main.js)  

To improve your experience, you can also...  
install [jupyter contrib extensions](https://jupyter-contrib-nbextensions.readthedocs.io/en/latest/install.html)  
and/or get a [graphical nbextensions configurator](https://github.com/Jupyter-contrib/jupyter_nbextensions_configurator)  

Usage
-----

Four Buttons are added by this extension:  

📌 pin - pin a cell to create a new subplot, moving the cell to the side  
🚫 unpin - return a subplot to the position of its referencing cell in the main notebook, or at the bottom if the reference was deleted  
👁 hide/show sideline - toggle the visibility of all subplots with a single button  
🔁 reload sideline - reload the layout and styling, useful when manually editing components/metadata/etc. of sideline  

You can also manually manipulate a cells' tags using the Cell Toolbar for tags. This is a standard feature of Jupyter Notebook, you can find it at View > Cell Toolbar > Tags. 

Help
-----

If you are looking for any help regarding this extension, want to share feedback or anything else, shoot me a message on kolb.luis (at) gmail.com!
