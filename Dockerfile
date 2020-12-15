FROM jupyter/datascience-notebook
WORKDIR /home/sideline
COPY . .
RUN jupyter nbextension install . --user
RUN jupyter nbextension enable main --user
USER root
CMD ["jupyter", "notebook", "--port=8888", "--no-browser", "--allow-root"]
