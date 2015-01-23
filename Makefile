.PHONY: clean build

build:
	if [ ! -d "addon-sdk-1.17" ]; then \
		curl -L "https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/addon-sdk-1.17.tar.gz" | tar zxvf -; \
	fi; \
	cd addon-sdk-1.17 && . bin/activate && cd ../ && cfx xpi;

clean:
	rm -rf addon-sdk-1.17 *.xpi
