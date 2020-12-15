This extension
==============

Focus on the narrative you want to tell and show code for data cleaning, exploration, and related tasks only on demand.

Installation
-----

The easiest method of trying out the extension is probably using Docker. Execute

`docker build --tag sideline .`  
`docker run -p 8888:8888 sideline`  

to start the container. (Dockerhub image coming soon)

Installing the extension outside of a Docker container:

Ensure Jupyter Notebook is installed (get it from https://jupyter.org/install)  

Execute the following commands:  

`git clone https://github.com/LuisKolb/sideline.git`  
`jupyter nbextension install sideline`  
`jupyter nbextension enable sideline/main`  

Optional:  
install jupyter contrib extension (see https://jupyter-contrib-nbextensions.readthedocs.io/en/latest/install.html)  
or just the nbextensions configurator (see https://github.com/Jupyter-contrib/jupyter_nbextensions_configurator)

Usage
-----

Four Buttons are added by this extension:  

📌 pin - pin a cell to mark it as a subplot  
🚫 unpin - undo the marking of a subplot, if possible, the unpinned cell will be placed at the position of its reference  
👁 hide/show - toggle the visibility of all subplots  
🔁 reload sideline - press this in case the extension fails to load or breaks  

Additionally, subplots and their markings can be manipulated.

Options
-------

Open Notebook with Subplots hidden (default true): cells marked as subplots are collapsed when the notebook is opened. (not yet implemented)  
