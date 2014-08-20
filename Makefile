.PHONY: clean build

build:
	curl -L https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.tar.gz | tar zxvf - && \
cd addon-sdk-1.17 && source bin/activate && cd ../ && \
cfx xpi

clean:
	rm -rf addon-sdk* *.xpi
