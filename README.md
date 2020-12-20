Sideline
==============

Focus on the narrative you want to tell and show code for data cleaning, exploration, and related tasks only on demand.  

Installation
-----

The easiest method of trying out the extension is probably using Docker. Get it from [DockerHub](https://hub.docker.com/repository/docker/luiskolb/sideline)  

You can also install the extension anywhere manually:  

Ensure Jupyter Notebook is installed (https://jupyter.org/install)  

Execute the following commands:  

`git clone https://github.com/LuisKolb/sideline.git`  
`jupyter nbextension install sideline`  
`jupyter nbextension enable sideline/main`  

Optionally, you can also...  
install [jupyter contrib extensions](https://jupyter-contrib-nbextensions.readthedocs.io/en/latest/install.html)  
or get [the nbextensions configurator](https://github.com/Jupyter-contrib/jupyter_nbextensions_configurator)  

Usage
-----

Four Buttons are added by this extension:  

📌 pin - pin a cell to mark it as a subplot  
🚫 unpin - undo the marking of a subplot, if possible, the unpinned cell will be placed at the position of its reference  
👁 hide/show - toggle the visibility of all subplots  
🔁 reload sideline - press this in case the extension fails to load or breaks  