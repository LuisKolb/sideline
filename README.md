Sideline
==============

Focus on the narrative you want to tell and show code for data cleaning, exploration, and related tasks only on demand.  

Installation
-----

The easiest method of trying out the extension is probably using Docker. Get the image from [DockerHub](https://hub.docker.com/repository/docker/luiskolb/sideline). Running the image will start a Notebook server on your local machine, which comes with sideline preinstalled (and many other packages, as it is based on the [jupyter/scipy-notebook image](https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html#jupyter-datascience-notebook)!  

You can also install the extension manually:  

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