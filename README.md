This extension
==============

Focus on the narrative you want to tell and show code for data cleaning, exploration, and related tasks only on demand.

Installation
-----
Ensure Jupyter Notebook is installed (get it from https://jupyter.org/install)  

To install the extension, execute the following instructions:  

`git clone https://github.com/LuisKolb/sideline.git`  
`cd sideline/`  
`jupyter nbextension install sideline`  
`jupyter nbextension enable sideline/main`  

optional:  
install jupyter contrib extension (see https://jupyter-contrib-nbextensions.readthedocs.io/en/latest/install.html)  
or just the nbextensions configurator (see https://github.com/Jupyter-contrib/jupyter_nbextensions_configurator)

Usage
-----

Three Buttons are added by this extension:  

📌 pin - pin a cell to mark it as a subplot  
🚫 unpin - undo the marking of a subplot, if possible, the unpinned cell will be placed at the position of its reference  
👁 hide/show - togle the visibility of all subplots  

Additionally, subplots and their markings can be manipulated

Options
-------

Open Notebook with Subplots hidden (default true): cells marked as subplots are collapsed when the notebook is opened.  
